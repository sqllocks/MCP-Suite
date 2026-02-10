import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import * as path from 'path';
import {
  config,
  createLogger,
  createModelManager,
  ModelManager,
  Logger,
  createToolDefinition,
  createTextContent,
  createErrorResponse
} from '@mcp-suite/shared';

// CRITICAL: Redirect console to stderr FIRST to prevent JSON-RPC corruption
console.log = console.error;
console.info = console.error;
console.warn = console.error;

// ⚠️ REPLACE THESE 3 CONSTANTS FOR EACH SERVER ⚠️
const SERVER_NAME = 'mcp-docs-generator';
const TOOL_NAME = 'generate_docs';
const DESCRIPTION = 'Generate documentation from code';

class DocsGeneratorServer {
  private server: Server;
  private logger: Logger;
  private modelManager: ModelManager;

  constructor() {
    // Logger writes to stderr (no stdout pollution)
    this.logger = createLogger({
      serviceName: SERVER_NAME,
      level: process.env.LOG_LEVEL || 'info',
      logToFile: true,
      logDir: path.join(config.getWorkspace(), 'logs')
    });

    this.modelManager = createModelManager(
      config.getOllamaUrl(),
      this.logger,
      config.getModelForServer(SERVER_NAME)
    );

    this.server = new Server(
      {
        name: SERVER_NAME,
        version: '3.0.0'
      },
      {
        capabilities: {
          tools: {}
        }
      }
    );

    this.setupHandlers();
    this.logger.info(`${SERVER_NAME} initialized`);
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          createToolDefinition(
            TOOL_NAME,
            DESCRIPTION,
            {
              input: {
                type: 'string',
                description: 'Input to process'
              },
              options: {
                type: 'object',
                description: 'Optional processing options (temperature, etc.)',
                properties: {
                  temperature: { type: 'number' },
                  includeContext: { type: 'boolean' }
                }
              }
            },
            ['input']
          )
        ]
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (request.params.name === TOOL_NAME) {
        return await this.handleToolExecution(request.params.arguments as any);
      }

      throw new Error(`Unknown tool: ${request.params.name}`);
    });
  }

  private async handleToolExecution(args: any) {
    const { input, options } = args;

    if (!input) {
      return createErrorResponse('Missing required parameter: input');
    }

    try {
      const startTime = Date.now();
      
      const prompt = `Process the following request for ${DESCRIPTION}:\n\n${input}`;
      const response = await this.modelManager.generate(prompt, options);
      
      const duration = Date.now() - startTime;
      
      this.logger.info('Tool executed successfully', {
        tool: TOOL_NAME,
        duration_ms: duration,
        model: this.modelManager.getCurrentModel()
      });

      return createTextContent(response);
    } catch (error: any) {
      this.logger.error('Tool execution failed', {
        tool: TOOL_NAME,
        error: error.message
      });
      
      return createErrorResponse(error);
    }
  }

  async start() {
    try {
      // Check Ollama health
      const isHealthy = await this.modelManager.checkHealth();
      if (!isHealthy) {
        this.logger.warn('Ollama not available, starting anyway');
      }

      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      
      this.logger.info(`${SERVER_NAME} MCP server started`, {
        model: this.modelManager.getCurrentModel(),
        tool: TOOL_NAME
      });
    } catch (error: any) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  }
}

const server = new DocsGeneratorServer();
server.start();

export default DocsGeneratorServer;
