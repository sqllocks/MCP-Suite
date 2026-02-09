#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { createLogger } from '@mcp-suite/shared';
import { Config, ConfigSchema, TableDef, RelationshipDef, CloudNode } from './config.js';
import { ERDGenerator } from './generators/erd-generator.js';
import { CloudArchitectureGenerator } from './generators/cloud-generator.js';
import fs from 'fs/promises';
import path from 'path';

class DiagramGeneratorServer {
  private server: Server;
  private config: Config;
  private logger: ReturnType<typeof createLogger>;
  private erdGenerator: ERDGenerator;
  private cloudGenerator: CloudArchitectureGenerator;

  constructor(config: Config) {
    this.config = config;
    this.logger = createLogger({ name: 'mcp-diagram-generator' });

    // Initialize generators
    this.erdGenerator = new ERDGenerator(this.logger);
    this.cloudGenerator = new CloudArchitectureGenerator(this.logger);

    // Create MCP server
    this.server = new Server(
      {
        name: 'mcp-diagram-generator',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
    this.logger.info('Diagram Generator Server initialized');
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools: Tool[] = [
        {
          name: 'generate_erd',
          description: 'Generate Erwin-style Entity-Relationship diagrams',
          inputSchema: {
            type: 'object',
            properties: {
              tables: {
                type: 'array',
                description: 'Array of table definitions',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    type: {
                      type: 'string',
                      enum: ['fact', 'dimension', 'bridge', 'reference', 'staging'],
                    },
                    columns: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          name: { type: 'string' },
                          dataType: { type: 'string' },
                          nullable: { type: 'boolean' },
                          isPrimaryKey: { type: 'boolean' },
                          isForeignKey: { type: 'boolean' },
                        },
                        required: ['name', 'dataType', 'nullable'],
                      },
                    },
                  },
                  required: ['name', 'type', 'columns'],
                },
              },
              relationships: {
                type: 'array',
                description: 'Array of relationships between tables',
                items: {
                  type: 'object',
                  properties: {
                    from: {
                      type: 'object',
                      properties: {
                        table: { type: 'string' },
                        columns: { type: 'array', items: { type: 'string' } },
                      },
                    },
                    to: {
                      type: 'object',
                      properties: {
                        table: { type: 'string' },
                        columns: { type: 'array', items: { type: 'string' } },
                      },
                    },
                    cardinality: {
                      type: 'string',
                      enum: ['1:1', '1:N', 'N:1', 'N:N'],
                    },
                  },
                },
              },
              output_format: {
                type: 'array',
                items: {
                  type: 'string',
                  enum: ['svg', 'mermaid', 'html'],
                },
                default: ['svg'],
              },
              diagram_type: {
                type: 'string',
                enum: ['logical', 'physical', 'both'],
                default: 'physical',
              },
              notation: {
                type: 'string',
                enum: ['crows-foot', 'idef1x', 'uml', 'chen'],
                default: 'crows-foot',
              },
              style: {
                type: 'string',
                enum: ['erwin', 'modern', 'visio', 'minimalist'],
                default: 'modern',
              },
              include: {
                type: 'object',
                properties: {
                  data_types: { type: 'boolean', default: true },
                  indexes: { type: 'boolean', default: false },
                  constraints: { type: 'boolean', default: false },
                },
              },
            },
            required: ['tables'],
          },
        },
        {
          name: 'generate_cloud_architecture',
          description: 'Generate Azure/cloud architecture diagrams',
          inputSchema: {
            type: 'object',
            properties: {
              nodes: {
                type: 'array',
                description: 'Array of cloud resources',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    type: {
                      type: 'string',
                      enum: ['resource', 'resource-group', 'subscription', 'network', 'security'],
                    },
                    service: { type: 'string' },
                    connections: {
                      type: 'array',
                      items: { type: 'string' },
                    },
                  },
                  required: ['id', 'name', 'type', 'service'],
                },
              },
              output_format: {
                type: 'array',
                items: {
                  type: 'string',
                  enum: ['svg', 'mermaid', 'html'],
                },
                default: ['svg'],
              },
              style: {
                type: 'string',
                enum: ['erwin', 'modern', 'visio', 'minimalist'],
                default: 'modern',
              },
            },
            required: ['nodes'],
          },
        },
      ];

      return { tools };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'generate_erd':
            return await this.handleGenerateERD(args);
          case 'generate_cloud_architecture':
            return await this.handleGenerateCloudArchitecture(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        this.logger.error({ error, tool: name }, 'Tool execution failed');
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  private async handleGenerateERD(args: any) {
    const {
      tables = [],
      relationships = [],
      output_format = ['svg'],
      diagram_type = 'physical',
      notation = 'crows-foot',
      style = 'modern',
      include = { data_types: true },
    } = args;

    this.logger.info({ tableCount: tables.length }, 'Generating ERD');

    const config = {
      diagram_type,
      notation,
      style,
      detail_level: 'detailed' as const,
      include,
    };

    const outputs: Record<string, string> = {};

    // Generate requested formats
    if (output_format.includes('svg')) {
      outputs.svg = await this.erdGenerator.generateERD(tables, relationships, config);
    }

    if (output_format.includes('mermaid')) {
      outputs.mermaid = this.erdGenerator.generateMermaid(tables, relationships);
    }

    if (output_format.includes('html')) {
      outputs.html = this.wrapInHTML(outputs.svg || '', 'Entity-Relationship Diagram');
    }

    // Save outputs
    const savedFiles = await this.saveOutputs(outputs, 'erd');

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              message: 'ERD generated successfully',
              files: savedFiles,
              stats: {
                tables: tables.length,
                relationships: relationships.length,
                formats: output_format,
              },
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async handleGenerateCloudArchitecture(args: any) {
    const {
      nodes = [],
      output_format = ['svg'],
      style = 'modern',
    } = args;

    this.logger.info({ nodeCount: nodes.length }, 'Generating cloud architecture');

    const outputs: Record<string, string> = {};

    // Generate requested formats
    if (output_format.includes('svg')) {
      outputs.svg = await this.cloudGenerator.generateArchitecture(nodes, style);
    }

    if (output_format.includes('mermaid')) {
      outputs.mermaid = this.cloudGenerator.generateMermaid(nodes);
    }

    if (output_format.includes('html')) {
      outputs.html = this.wrapInHTML(outputs.svg || '', 'Cloud Architecture');
    }

    // Save outputs
    const savedFiles = await this.saveOutputs(outputs, 'cloud-arch');

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              message: 'Cloud architecture diagram generated successfully',
              files: savedFiles,
              stats: {
                nodes: nodes.length,
                formats: output_format,
              },
            },
            null,
            2
          ),
        },
      ],
    };
  }

  /**
   * Wrap SVG in HTML for interactive viewing
   */
  private wrapInHTML(svg: string, title: string): string {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      padding: 20px;
      font-family: Arial, sans-serif;
      background: #f5f5f5;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    h1 {
      color: #333;
      margin-bottom: 20px;
    }
    .diagram-container {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      max-width: 100%;
      overflow: auto;
    }
    svg {
      max-width: 100%;
      height: auto;
    }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <div class="diagram-container">
    ${svg}
  </div>
</body>
</html>`;
  }

  /**
   * Save outputs to files
   */
  private async saveOutputs(outputs: Record<string, string>, prefix: string): Promise<string[]> {
    const savedFiles: string[] = [];

    await fs.mkdir(this.config.output_path, { recursive: true });

    for (const [format, content] of Object.entries(outputs)) {
      const filename = `${prefix}-${Date.now()}.${format}`;
      const filepath = path.join(this.config.output_path, filename);

      await fs.writeFile(filepath, content, 'utf-8');
      savedFiles.push(filepath);

      this.logger.debug({ filepath }, 'Saved diagram file');
    }

    return savedFiles;
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    this.logger.info('Server running on stdio');
  }
}

// Main entry point
async function main() {
  try {
    const config: Config = ConfigSchema.parse({});

    const server = new DiagramGeneratorServer(config);
    await server.run();
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();
