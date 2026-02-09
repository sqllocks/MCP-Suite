#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { createLogger, loadConfig } from '@mcp-suite/shared';
import { Config, ConfigSchema, CONSULTING_TEMPLATES } from './config.js';
import { WorkspaceParser } from './parsers/workspace-parser.js';
import { WorkspaceAnalyzer } from './analyzers/workspace-analyzer.js';
import { DocxGenerator } from './generators/docx-generator.js';
import { PptxGenerator } from './generators/pptx-generator.js';
import { ExcelGenerator } from './generators/excel-generator.js';
import path from 'path';

class DocsGeneratorServer {
  private server: Server;
  private config: Config;
  private logger: ReturnType<typeof createLogger>;
  private workspaceParser: WorkspaceParser;
  private workspaceAnalyzer: WorkspaceAnalyzer;
  private docxGenerator: DocxGenerator;
  private pptxGenerator: PptxGenerator;
  private excelGenerator: ExcelGenerator;

  constructor(config: Config) {
    this.config = config;
    this.logger = createLogger({ name: 'mcp-docs-generator' });

    // Initialize components
    this.workspaceParser = new WorkspaceParser(this.logger);
    this.workspaceAnalyzer = new WorkspaceAnalyzer(this.logger);
    this.docxGenerator = new DocxGenerator(this.logger);
    this.pptxGenerator = new PptxGenerator(this.logger);
    this.excelGenerator = new ExcelGenerator(this.logger);

    // Create MCP server
    this.server = new Server(
      {
        name: 'mcp-docs-generator',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
    this.logger.info('Docs Generator Server initialized');
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools: Tool[] = [
        {
          name: 'generate_full_documentation',
          description: 'Generate complete consulting documentation suite',
          inputSchema: {
            type: 'object',
            properties: {
              workspace_path: {
                type: 'string',
                description: 'Path to workspace directory',
              },
              output_path: {
                type: 'string',
                description: 'Output directory path',
              },
              template: {
                type: 'string',
                enum: ['mckinsey', 'bcg', 'bain', 'deloitte', 'standard'],
                description: 'Documentation template',
                default: 'standard',
              },
              sections: {
                type: 'array',
                items: { type: 'string' },
                description: 'Sections to include',
              },
              formats: {
                type: 'array',
                items: {
                  type: 'string',
                  enum: ['docx', 'pdf', 'pptx', 'xlsx', 'html'],
                },
                description: 'Output formats',
              },
              client_name: {
                type: 'string',
                description: 'Client name',
              },
              project_name: {
                type: 'string',
                description: 'Project name',
              },
            },
            required: ['workspace_path', 'output_path'],
          },
        },
        {
          name: 'analyze_workspace',
          description: 'Deep analysis with insights and recommendations',
          inputSchema: {
            type: 'object',
            properties: {
              workspace_path: {
                type: 'string',
                description: 'Path to workspace directory',
              },
              checks: {
                type: 'array',
                items: {
                  type: 'string',
                  enum: ['performance', 'security', 'best-practices'],
                },
                description: 'Analysis checks to run',
                default: ['performance', 'security', 'best-practices'],
              },
              severity_threshold: {
                type: 'string',
                enum: ['low', 'medium', 'high', 'critical'],
                description: 'Minimum severity to report',
                default: 'medium',
              },
            },
            required: ['workspace_path'],
          },
        },
        {
          name: 'generate_catalog',
          description: 'Create comprehensive data catalog',
          inputSchema: {
            type: 'object',
            properties: {
              workspace_path: {
                type: 'string',
                description: 'Path to workspace directory',
              },
              output_path: {
                type: 'string',
                description: 'Output file path (.xlsx)',
              },
              include_samples: {
                type: 'boolean',
                description: 'Include sample data',
                default: false,
              },
              include_profiling: {
                type: 'boolean',
                description: 'Include data profiling',
                default: true,
              },
            },
            required: ['workspace_path', 'output_path'],
          },
        },
        {
          name: 'generate_comparison_report',
          description: 'Compare two workspace versions',
          inputSchema: {
            type: 'object',
            properties: {
              baseline: {
                type: 'string',
                description: 'Baseline workspace path',
              },
              current: {
                type: 'string',
                description: 'Current workspace path',
              },
              output: {
                type: 'string',
                description: 'Output file path',
              },
            },
            required: ['baseline', 'current', 'output'],
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
          case 'generate_full_documentation':
            return await this.handleGenerateFullDocumentation(args);
          case 'analyze_workspace':
            return await this.handleAnalyzeWorkspace(args);
          case 'generate_catalog':
            return await this.handleGenerateCatalog(args);
          case 'generate_comparison_report':
            return await this.handleGenerateComparison(args);
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

  private async handleGenerateFullDocumentation(args: any) {
    const {
      workspace_path,
      output_path,
      template = 'standard',
      formats = ['docx', 'pptx', 'xlsx'],
      client_name,
      project_name,
    } = args;

    this.logger.info({ workspace_path, output_path }, 'Generating full documentation');

    // Parse workspace
    const workspace = await this.workspaceParser.parseWorkspace(workspace_path);

    // Analyze workspace
    const analysis = await this.workspaceAnalyzer.analyzeWorkspace(workspace);

    // Extract catalog
    const catalog = await this.workspaceParser.extractCatalog(workspace);

    // Get template config
    const templateConfig = CONSULTING_TEMPLATES[template];

    const generatedFiles: string[] = [];

    // Generate requested formats
    if (formats.includes('docx')) {
      const docPath = path.join(output_path, 'Executive-Summary.docx');
      await this.docxGenerator.generateExecutiveSummary(analysis, docPath, {
        clientName: client_name,
        projectName: project_name,
        template,
      });
      generatedFiles.push(docPath);

      const techDocPath = path.join(output_path, 'Technical-Architecture.docx');
      await this.docxGenerator.generateTechnicalDocument(analysis, techDocPath, {
        clientName: client_name,
        projectName: project_name,
        template,
      });
      generatedFiles.push(techDocPath);
    }

    if (formats.includes('pptx')) {
      const pptxPath = path.join(output_path, 'Recommendations.pptx');
      await this.pptxGenerator.generateRecommendations(analysis, pptxPath, {
        clientName: client_name,
        projectName: project_name,
        template: templateConfig,
      });
      generatedFiles.push(pptxPath);
    }

    if (formats.includes('xlsx')) {
      const xlsxPath = path.join(output_path, 'Data-Catalog.xlsx');
      await this.excelGenerator.generateCatalog(workspace, catalog, xlsxPath);
      generatedFiles.push(xlsxPath);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              message: 'Documentation generated successfully',
              files: generatedFiles,
              summary: {
                items_analyzed: workspace.items.length,
                findings: analysis.findings.length,
                recommendations: analysis.recommendations.length,
              },
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async handleAnalyzeWorkspace(args: any) {
    const {
      workspace_path,
      checks = ['performance', 'security', 'best-practices'],
      severity_threshold = 'medium',
    } = args;

    this.logger.info({ workspace_path, checks }, 'Analyzing workspace');

    // Parse workspace
    const workspace = await this.workspaceParser.parseWorkspace(workspace_path);

    // Analyze workspace
    const analysis = await this.workspaceAnalyzer.analyzeWorkspace(workspace, checks);

    // Filter by severity threshold
    const severityOrder = { low: 0, medium: 1, high: 2, critical: 3 };
    const thresholdLevel = severityOrder[severity_threshold];

    const filteredFindings = analysis.findings.filter(
      (f) => severityOrder[f.severity] >= thresholdLevel
    );

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              ...analysis,
              findings: filteredFindings,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async handleGenerateCatalog(args: any) {
    const {
      workspace_path,
      output_path,
      include_samples = false,
      include_profiling = true,
    } = args;

    this.logger.info({ workspace_path, output_path }, 'Generating catalog');

    // Parse workspace
    const workspace = await this.workspaceParser.parseWorkspace(workspace_path);

    // Extract catalog
    const catalog = await this.workspaceParser.extractCatalog(workspace);

    // Generate Excel catalog
    await this.excelGenerator.generateCatalog(workspace, catalog, output_path, {
      includeSamples: include_samples,
      includeProfiling: include_profiling,
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              message: 'Catalog generated successfully',
              output: output_path,
              entries: catalog.length,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async handleGenerateComparison(args: any) {
    const { baseline, current, output } = args;

    this.logger.info({ baseline, current, output }, 'Generating comparison report');

    // Parse both workspaces
    const baselineWorkspace = await this.workspaceParser.parseWorkspace(baseline);
    const currentWorkspace = await this.workspaceParser.parseWorkspace(current);

    // Generate comparison
    await this.excelGenerator.generateComparison(
      baselineWorkspace,
      currentWorkspace,
      output
    );

    // Calculate changes
    const changes = {
      added: currentWorkspace.items.filter(
        (item) => !baselineWorkspace.items.find((b) => b.name === item.name)
      ).length,
      removed: baselineWorkspace.items.filter(
        (item) => !currentWorkspace.items.find((c) => c.name === item.name)
      ).length,
      modified: 0, // Simplified
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              message: 'Comparison report generated successfully',
              output,
              changes,
            },
            null,
            2
          ),
        },
      ],
    };
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
    // Load config (simplified for standalone mode)
    const config: Config = ConfigSchema.parse({});

    // Create and run server
    const server = new DocsGeneratorServer(config);
    await server.run();
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();
