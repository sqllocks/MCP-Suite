/**
 * Document Template MCP Server
 * Main server implementation
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';

import { IconManager } from './icons/icon-manager.js';
import { DiagramGenerator } from './diagrams/diagram-generator.js';
import { DocumentGenerator } from './templates/document-generator.js';
import { LegendGenerator } from './diagrams/legend-generator.js';
import { ExportManager } from './exporters/export-manager.js';

export class DocumentTemplateServer {
  private server: Server;
  private iconManager: IconManager;
  private diagramGenerator: DiagramGenerator;
  private documentGenerator: DocumentGenerator;
  private legendGenerator: LegendGenerator;
  private exportManager: ExportManager;

  constructor() {
    this.server = new Server(
      {
        name: 'document-template-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Initialize managers
    this.iconManager = new IconManager();
    this.diagramGenerator = new DiagramGenerator(this.iconManager);
    this.documentGenerator = new DocumentGenerator();
    this.legendGenerator = new LegendGenerator(this.iconManager);
    this.exportManager = new ExportManager();

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: this.getTools(),
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) =>
      this.handleToolCall(request)
    );
  }

  private getTools(): Tool[] {
    return [
      // Document Generation
      {
        name: 'create_document',
        description: 'Generate a document from template (Word, Excel, PowerPoint)',
        inputSchema: {
          type: 'object',
          properties: {
            template: {
              type: 'string',
              description: 'Template name (e.g., "adr", "design-doc", "technical-spec")',
            },
            format: {
              type: 'string',
              enum: ['docx', 'xlsx', 'pptx', 'md'],
              description: 'Output format',
            },
            data: {
              type: 'object',
              description: 'Template data (title, content, sections, etc.)',
            },
            style: {
              type: 'string',
              enum: ['professional', 'modern', 'minimal', 'corporate'],
              description: 'Document style',
            },
          },
          required: ['template', 'format', 'data'],
        },
      },

      {
        name: 'list_templates',
        description: 'List all available document templates',
        inputSchema: {
          type: 'object',
          properties: {
            category: {
              type: 'string',
              enum: ['tech', 'big-three', 'healthcare', 'all'],
              description: 'Filter by category',
            },
          },
        },
      },

      // Diagram Creation
      {
        name: 'create_er_diagram',
        description: 'Create ERwin-style entity relationship diagram',
        inputSchema: {
          type: 'object',
          properties: {
            entities: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  attributes: { type: 'array', items: { type: 'string' } },
                  primaryKey: { type: 'string' },
                },
              },
              description: 'Database entities',
            },
            relationships: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  from: { type: 'string' },
                  to: { type: 'string' },
                  type: { type: 'string', enum: ['one-to-one', 'one-to-many', 'many-to-many'] },
                },
              },
              description: 'Entity relationships',
            },
            notation: {
              type: 'string',
              enum: ['crows-foot', 'ie', 'idef1x'],
              description: 'ER diagram notation style',
            },
          },
          required: ['entities', 'relationships'],
        },
      },

      {
        name: 'create_architecture_diagram',
        description: 'Create cloud/system architecture diagram with auto-icons',
        inputSchema: {
          type: 'object',
          properties: {
            platform: {
              type: 'string',
              enum: ['azure', 'aws', 'fabric', 'on-prem', 'multi-cloud'],
              description: 'Cloud platform',
            },
            components: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string', description: 'Component type (lakehouse, warehouse, etc.)' },
                  name: { type: 'string' },
                  properties: { type: 'object' },
                },
              },
              description: 'Architecture components',
            },
            connections: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  from: { type: 'string' },
                  to: { type: 'string' },
                  label: { type: 'string' },
                  type: { type: 'string' },
                },
              },
              description: 'Connections between components',
            },
            autoIcons: {
              type: 'boolean',
              description: 'Automatically add official icons',
              default: true,
            },
            generateLegend: {
              type: 'boolean',
              description: 'Generate icon legend',
              default: true,
            },
          },
          required: ['platform', 'components'],
        },
      },

      {
        name: 'create_network_diagram',
        description: 'Create Cisco-style network topology diagram',
        inputSchema: {
          type: 'object',
          properties: {
            devices: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string', enum: ['router', 'switch', 'firewall', 'server', 'load-balancer'] },
                  name: { type: 'string' },
                  zone: { type: 'string' },
                },
              },
              description: 'Network devices',
            },
            connections: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  from: { type: 'string' },
                  to: { type: 'string' },
                  protocol: { type: 'string' },
                  bandwidth: { type: 'string' },
                },
              },
              description: 'Network connections',
            },
            style: {
              type: 'string',
              enum: ['cisco', 'juniper', 'generic'],
              description: 'Network diagram style',
            },
          },
          required: ['devices', 'connections'],
        },
      },

      {
        name: 'create_sequence_diagram',
        description: 'Create PlantUML-style sequence diagram',
        inputSchema: {
          type: 'object',
          properties: {
            actors: {
              type: 'array',
              items: { type: 'string' },
              description: 'Participants/actors in the sequence',
            },
            interactions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  from: { type: 'string' },
                  to: { type: 'string' },
                  message: { type: 'string' },
                  type: { type: 'string', enum: ['sync', 'async', 'return'] },
                },
              },
              description: 'Interactions between actors',
            },
          },
          required: ['actors', 'interactions'],
        },
      },

      {
        name: 'create_data_flow_diagram',
        description: 'Create data pipeline/lineage diagram for Fabric',
        inputSchema: {
          type: 'object',
          properties: {
            sources: {
              type: 'array',
              items: { type: 'object' },
              description: 'Data sources',
            },
            transformations: {
              type: 'array',
              items: { type: 'object' },
              description: 'Data transformations',
            },
            destinations: {
              type: 'array',
              items: { type: 'object' },
              description: 'Data destinations',
            },
            style: {
              type: 'string',
              enum: ['lineage', 'pipeline', 'flow'],
              description: 'Data flow style',
            },
          },
          required: ['sources', 'destinations'],
        },
      },

      // Icon Management
      {
        name: 'download_icons',
        description: 'Download official icon libraries (Microsoft, AWS, Cisco)',
        inputSchema: {
          type: 'object',
          properties: {
            libraries: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['fabric', 'azure', 'aws', 'cisco', 'kubernetes', 'all'],
              },
              description: 'Icon libraries to download',
            },
            force: {
              type: 'boolean',
              description: 'Force re-download if already cached',
              default: false,
            },
          },
          required: ['libraries'],
        },
      },

      {
        name: 'list_icons',
        description: 'List all available icons in libraries',
        inputSchema: {
          type: 'object',
          properties: {
            library: {
              type: 'string',
              enum: ['fabric', 'azure', 'aws', 'cisco', 'kubernetes', 'all'],
              description: 'Icon library to list',
            },
            search: {
              type: 'string',
              description: 'Search term to filter icons',
            },
          },
        },
      },

      {
        name: 'generate_legend',
        description: 'Generate icon legend for diagram',
        inputSchema: {
          type: 'object',
          properties: {
            icons: {
              type: 'array',
              items: { type: 'string' },
              description: 'Icon names used in diagram',
            },
            format: {
              type: 'string',
              enum: ['table', 'grid', 'list'],
              description: 'Legend format',
            },
            includeDescriptions: {
              type: 'boolean',
              description: 'Include icon descriptions',
              default: true,
            },
          },
          required: ['icons'],
        },
      },

      // Export
      {
        name: 'export_document',
        description: 'Export document to Word, Excel, or PowerPoint',
        inputSchema: {
          type: 'object',
          properties: {
            content: {
              type: 'string',
              description: 'Document content (markdown, HTML, or JSON)',
            },
            format: {
              type: 'string',
              enum: ['docx', 'xlsx', 'pptx', 'pdf'],
              description: 'Export format',
            },
            template: {
              type: 'string',
              description: 'Template to apply',
            },
            options: {
              type: 'object',
              description: 'Export options (page size, margins, etc.)',
            },
          },
          required: ['content', 'format'],
        },
      },

      {
        name: 'export_diagram',
        description: 'Export diagram to multiple formats',
        inputSchema: {
          type: 'object',
          properties: {
            diagram: {
              type: 'string',
              description: 'Diagram content (SVG, Mermaid, or internal format)',
            },
            formats: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['svg', 'png', 'pdf', 'jpg'],
              },
              description: 'Output formats',
            },
            resolution: {
              type: 'string',
              enum: ['low', 'medium', 'high', 'print'],
              description: 'Output resolution',
              default: 'high',
            },
            embedInDocument: {
              type: 'boolean',
              description: 'Embed in Word/PowerPoint document',
              default: false,
            },
          },
          required: ['diagram', 'formats'],
        },
      },
    ];
  }

  private async handleToolCall(request: any): Promise<any> {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case 'create_document':
          return await this.createDocument(args);
        
        case 'list_templates':
          return await this.listTemplates(args);
        
        case 'create_er_diagram':
          return await this.createERDiagram(args);
        
        case 'create_architecture_diagram':
          return await this.createArchitectureDiagram(args);
        
        case 'create_network_diagram':
          return await this.createNetworkDiagram(args);
        
        case 'create_sequence_diagram':
          return await this.createSequenceDiagram(args);
        
        case 'create_data_flow_diagram':
          return await this.createDataFlowDiagram(args);
        
        case 'download_icons':
          return await this.downloadIcons(args);
        
        case 'list_icons':
          return await this.listIcons(args);
        
        case 'generate_legend':
          return await this.generateLegend(args);
        
        case 'export_document':
          return await this.exportDocument(args);
        
        case 'export_diagram':
          return await this.exportDiagram(args);
        
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }

  // Tool implementations
  private async createDocument(args: any) {
    const doc = await this.documentGenerator.generate(args);
    return {
      content: [
        {
          type: 'text',
          text: `Document created: ${doc.fileName}`,
        },
        {
          type: 'resource',
          resource: {
            uri: doc.path,
            mimeType: doc.mimeType,
          },
        },
      ],
    };
  }

  private async listTemplates(args: any) {
    const templates = await this.documentGenerator.listTemplates(args.category || 'all');
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(templates, null, 2),
        },
      ],
    };
  }

  private async createERDiagram(args: any) {
    const diagram = await this.diagramGenerator.createERDiagram(args);
    return {
      content: [
        {
          type: 'text',
          text: 'ER Diagram created',
        },
        {
          type: 'image',
          data: diagram.svg,
          mimeType: 'image/svg+xml',
        },
      ],
    };
  }

  private async createArchitectureDiagram(args: any) {
    const diagram = await this.diagramGenerator.createArchitecture(args);
    
    const content: any[] = [
      {
        type: 'text',
        text: `Architecture diagram created for ${args.platform}`,
      },
      {
        type: 'image',
        data: diagram.svg,
        mimeType: 'image/svg+xml',
      },
    ];

    if (args.generateLegend) {
      const legend = await this.legendGenerator.generate(diagram.usedIcons);
      content.push({
        type: 'text',
        text: `\n\nLegend:\n${legend}`,
      });
    }

    return { content };
  }

  private async createNetworkDiagram(args: any) {
    const diagram = await this.diagramGenerator.createNetwork(args);
    return {
      content: [
        {
          type: 'image',
          data: diagram.svg,
          mimeType: 'image/svg+xml',
        },
      ],
    };
  }

  private async createSequenceDiagram(args: any) {
    const diagram = await this.diagramGenerator.createSequence(args);
    return {
      content: [
        {
          type: 'image',
          data: diagram.svg,
          mimeType: 'image/svg+xml',
        },
      ],
    };
  }

  private async createDataFlowDiagram(args: any) {
    const diagram = await this.diagramGenerator.createDataFlow(args);
    return {
      content: [
        {
          type: 'image',
          data: diagram.svg,
          mimeType: 'image/svg+xml',
        },
      ],
    };
  }

  private async downloadIcons(args: any) {
    const results = await this.iconManager.downloadLibraries(args.libraries, args.force);
    return {
      content: [
        {
          type: 'text',
          text: `Downloaded ${results.length} icon libraries:\n${results.map(r => `- ${r.name}: ${r.count} icons`).join('\n')}`,
        },
      ],
    };
  }

  private async listIcons(args: any) {
    const icons = await this.iconManager.listIcons(args.library, args.search);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(icons, null, 2),
        },
      ],
    };
  }

  private async generateLegend(args: any) {
    const legend = await this.legendGenerator.generate(args.icons, {
      format: args.format,
      includeDescriptions: args.includeDescriptions,
    });
    return {
      content: [
        {
          type: 'text',
          text: legend,
        },
      ],
    };
  }

  private async exportDocument(args: any) {
    const exported = await this.exportManager.exportDocument(args);
    return {
      content: [
        {
          type: 'text',
          text: `Document exported to ${args.format}`,
        },
        {
          type: 'resource',
          resource: {
            uri: exported.path,
            mimeType: exported.mimeType,
          },
        },
      ],
    };
  }

  private async exportDiagram(args: any) {
    const exported = await this.exportManager.exportDiagram(args);
    return {
      content: exported.files.map((file: any) => ({
        type: 'resource',
        resource: {
          uri: file.path,
          mimeType: file.mimeType,
        },
      })),
    };
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Document Template MCP Server running on stdio');
  }
}

// Start server if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new DocumentTemplateServer();
  server.start().catch((error) => {
    console.error('Server error:', error);
    process.exit(1);
  });
}
