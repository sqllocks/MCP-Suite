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

const SERVER_NAME = 'mcp-sql-explorer';

class SQLExplorerServer {
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
            'generate_sql',
            'Generate SQL query from natural language description',
            {
              description: {
                type: 'string',
                description: 'Natural language description of what the query should do'
              },
              schema: {
                type: 'string',
                description: 'Optional database schema context'
              },
              dialect: {
                type: 'string',
                description: 'Optional SQL dialect (e.g., PostgreSQL, MySQL, SQLite)',
                enum: ['PostgreSQL', 'MySQL', 'SQLite', 'SQL Server', 'Oracle']
              }
            },
            ['description']
          ),
          createToolDefinition(
            'query_sql',
            'Analyze SQL query and provide insights, optimization suggestions',
            {
              query: {
                type: 'string',
                description: 'SQL query to analyze'
              },
              schema: {
                type: 'string',
                description: 'Optional database schema context'
              }
            },
            ['query']
          ),
          createToolDefinition(
            'explain_sql',
            'Explain what a SQL query does in simple terms',
            {
              sql: {
                type: 'string',
                description: 'SQL query to explain'
              }
            },
            ['sql']
          )
        ]
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case 'generate_sql':
          return await this.handleGenerateSQL(args as any);
        case 'query_sql':
          return await this.handleQuerySQL(args as any);
        case 'explain_sql':
          return await this.handleExplainSQL(args as any);
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  private async handleGenerateSQL(args: any) {
    const { description, schema, dialect } = args;

    if (!description) {
      return createErrorResponse('Missing required parameter: description');
    }

    try {
      const startTime = Date.now();

      const prompt = `Generate a SQL query for the following request:
${description}

${schema ? `Database schema:\n${schema}\n\n` : ''}
${dialect ? `SQL Dialect: ${dialect}\n\n` : ''}

Provide only the SQL query, no explanations.`;

      const response = await this.modelManager.generate(prompt);

      const duration = Date.now() - startTime;

      this.logger.info('SQL generated from natural language', {
        tool: 'generate_sql',
        duration_ms: duration,
        model: this.modelManager.getCurrentModel()
      });

      return createTextContent(response);
    } catch (error: any) {
      this.logger.error('SQL generation failed', {
        tool: 'generate_sql',
        error: error.message
      });

      return createErrorResponse(error);
    }
  }

  private async handleQuerySQL(args: any) {
    const { query, schema } = args;

    if (!query) {
      return createErrorResponse('Missing required parameter: query');
    }

    try {
      const startTime = Date.now();

      const prompt = this.buildQueryPrompt(query, schema);
      const response = await this.modelManager.generate(prompt);

      const duration = Date.now() - startTime;

      this.logger.info('SQL query analyzed', {
        tool: 'query_sql',
        duration_ms: duration,
        queryLength: query.length,
        model: this.modelManager.getCurrentModel()
      });

      return createTextContent(response);
    } catch (error: any) {
      this.logger.error('SQL query analysis failed', {
        tool: 'query_sql',
        error: error.message
      });

      return createErrorResponse(error);
    }
  }

  private async handleExplainSQL(args: any) {
    const { sql } = args;

    if (!sql) {
      return createErrorResponse('Missing required parameter: sql');
    }

    try {
      const startTime = Date.now();

      const prompt = `Explain the following SQL query in simple terms:

${sql}

Provide a clear explanation of what this query does, step by step.`;

      const response = await this.modelManager.generate(prompt);

      const duration = Date.now() - startTime;

      this.logger.info('SQL explained', {
        tool: 'explain_sql',
        duration_ms: duration,
        model: this.modelManager.getCurrentModel()
      });

      return createTextContent(response);
    } catch (error: any) {
      this.logger.error('SQL explanation failed', {
        tool: 'explain_sql',
        error: error.message
      });

      return createErrorResponse(error);
    }
  }

  private buildQueryPrompt(query: string, schema?: string): string {
    let prompt = `Analyze the following SQL query:\n\n${query}\n\n`;

    if (schema) {
      prompt += `Database schema:\n${schema}\n\n`;
    }

    prompt += 'Provide insights about this query including:\n';
    prompt += '1. What it does\n';
    prompt += '2. Potential performance issues\n';
    prompt += '3. Suggestions for optimization\n';

    return prompt;
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
        tools: ['generate_sql', 'query_sql', 'explain_sql']
      });
    } catch (error: any) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  }
}

const server = new SQLExplorerServer();
server.start();

export default SQLExplorerServer;
