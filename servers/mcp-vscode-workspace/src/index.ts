#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { createLogger, loadConfigFromEnv } from '@mcp-suite/shared';
import { Config, ConfigSchema, PlatformConfig, ExtensionRecommendation, WorkspaceStructure } from './config.js';
import * as fs from 'fs-extra';
import * as path from 'path';

class VSCodeWorkspaceServer {
  private server: Server;
  private config: Config;
  private logger: ReturnType<typeof createLogger>;

  constructor(config: Config) {
    this.config = config;
    this.logger = createLogger({ name: 'mcp-vscode-workspace' });

    // Create MCP server
    this.server = new Server(
      {
        name: 'mcp-vscode-workspace',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
    this.logger.info('VS Code workspace server initialized');
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools: Tool[] = [
        {
          name: 'workspace_scaffold',
          description: 'Create complete workspace structure for a client project',
          inputSchema: {
            type: 'object',
            properties: {
              client_name: {
                type: 'string',
                description: 'Client name (e.g., "ClientA")',
              },
              platform: {
                type: 'string',
                description: 'Platform (fabric, databricks, snowflake)',
                enum: ['fabric', 'databricks', 'snowflake', 'multi-cloud'],
              },
              output_path: {
                type: 'string',
                description: 'Where to create workspace',
              },
            },
            required: ['client_name', 'platform', 'output_path'],
          },
        },
        {
          name: 'workspace_recommend_extensions',
          description: 'Get recommended VS Code extensions for a platform',
          inputSchema: {
            type: 'object',
            properties: {
              platform: {
                type: 'string',
                description: 'Platform name',
                enum: ['fabric', 'databricks', 'snowflake', 'azure', 'aws', 'gcp'],
              },
            },
            required: ['platform'],
          },
        },
        {
          name: 'workspace_create_snippets',
          description: 'Create code snippets for a platform',
          inputSchema: {
            type: 'object',
            properties: {
              platform: {
                type: 'string',
                description: 'Platform name',
              },
              output_path: {
                type: 'string',
                description: 'Where to save snippets',
              },
              languages: {
                type: 'array',
                items: { type: 'string' },
                description: 'Languages (sql, python, dax, m, etc.)',
              },
            },
            required: ['platform', 'output_path'],
          },
        },
        {
          name: 'workspace_setup_launch_configs',
          description: 'Create debug/launch configurations',
          inputSchema: {
            type: 'object',
            properties: {
              platform: {
                type: 'string',
                description: 'Platform name',
              },
              output_path: {
                type: 'string',
                description: 'Where to save launch.json',
              },
            },
            required: ['platform', 'output_path'],
          },
        },
        {
          name: 'workspace_organize_files',
          description: 'Reorganize project files by strategy',
          inputSchema: {
            type: 'object',
            properties: {
              workspace_path: {
                type: 'string',
                description: 'Workspace root path',
              },
              strategy: {
                type: 'string',
                description: 'Organization strategy',
                enum: ['by-feature', 'by-type', 'by-layer'],
              },
            },
            required: ['workspace_path', 'strategy'],
          },
        },
      ];

      return { tools };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        let result: any;

        switch (name) {
          case 'workspace_scaffold':
            result = await this.scaffoldWorkspace(args);
            break;
          case 'workspace_recommend_extensions':
            result = await this.recommendExtensions(args);
            break;
          case 'workspace_create_snippets':
            result = await this.createSnippets(args);
            break;
          case 'workspace_setup_launch_configs':
            result = await this.setupLaunchConfigs(args);
            break;
          case 'workspace_organize_files':
            result = await this.organizeFiles(args);
            break;
          default:
            throw new Error(`Unknown tool: ${name}`);
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
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

  // ============================================
  // TOOL IMPLEMENTATIONS
  // ============================================

  private async scaffoldWorkspace(args: any): Promise<WorkspaceStructure> {
    const { client_name, platform, output_path } = args;

    const workspacePath = path.join(output_path, client_name);
    
    // Create directory structure
    const folders = [
      'src',
      'docs',
      'tests',
      'scripts',
      'data',
      '.vscode',
    ];

    for (const folder of folders) {
      await fs.ensureDir(path.join(workspacePath, folder));
    }

    // Get platform config
    const platformConfig = this.getPlatformConfig(platform);

    // Create .vscode/settings.json
    const settingsPath = path.join(workspacePath, '.vscode', 'settings.json');
    await fs.writeJson(settingsPath, platformConfig.settings, { spaces: 2 });

    // Create .vscode/extensions.json
    const extensionsPath = path.join(workspacePath, '.vscode', 'extensions.json');
    await fs.writeJson(
      extensionsPath,
      { recommendations: platformConfig.extensions },
      { spaces: 2 }
    );

    // Create README
    const readmePath = path.join(workspacePath, 'README.md');
    const readme = this.generateReadme(client_name, platform);
    await fs.writeFile(readmePath, readme);

    // Create .gitignore
    const gitignorePath = path.join(workspacePath, '.gitignore');
    await fs.writeFile(gitignorePath, this.getGitignore());

    this.logger.info({ client: client_name, path: workspacePath }, 'Workspace scaffolded');

    return {
      folders,
      files: {
        'settings.json': settingsPath,
        'extensions.json': extensionsPath,
        'README.md': readmePath,
        '.gitignore': gitignorePath,
      },
      settings: platformConfig.settings,
    };
  }

  private async recommendExtensions(args: any): Promise<ExtensionRecommendation[]> {
    const { platform } = args;
    const config = this.getPlatformConfig(platform);

    const extensionDetails: Record<string, ExtensionRecommendation> = {
      // Universal
      'ms-python.python': {
        id: 'ms-python.python',
        name: 'Python',
        description: 'Python language support',
        required: true,
      },
      'ms-vscode.powershell': {
        id: 'ms-vscode.powershell',
        name: 'PowerShell',
        description: 'PowerShell language support',
        required: false,
      },
      // Fabric/Power BI
      'powerquery.vscode-powerquery': {
        id: 'powerquery.vscode-powerquery',
        name: 'Power Query',
        description: 'M language support for Power Query',
        required: true,
      },
      'sqlbi.bravo': {
        id: 'sqlbi.bravo',
        name: 'Bravo for Power BI',
        description: 'DAX formatting and analysis',
        required: false,
      },
      // Databricks
      'databricks.databricks': {
        id: 'databricks.databricks',
        name: 'Databricks',
        description: 'Databricks integration',
        required: true,
      },
      // SQL
      'ms-mssql.mssql': {
        id: 'ms-mssql.mssql',
        name: 'SQL Server',
        description: 'SQL Server tools',
        required: true,
      },
      // Azure
      'ms-azuretools.vscode-azurefunctions': {
        id: 'ms-azuretools.vscode-azurefunctions',
        name: 'Azure Functions',
        description: 'Azure Functions support',
        required: false,
      },
    };

    return config.extensions
      .map(ext => extensionDetails[ext])
      .filter(Boolean);
  }

  private async createSnippets(args: any): Promise<{ created: string[] }> {
    const { platform, output_path, languages = [] } = args;
    const created: string[] = [];

    const snippetsDir = path.join(output_path, '.vscode');
    await fs.ensureDir(snippetsDir);

    // Get platform snippets
    const platformSnippets = this.getPlatformSnippets(platform);

    for (const [lang, snippets] of Object.entries(platformSnippets)) {
      if (languages.length === 0 || languages.includes(lang)) {
        const snippetFile = path.join(snippetsDir, `${lang}.code-snippets`);
        await fs.writeJson(snippetFile, snippets, { spaces: 2 });
        created.push(snippetFile);
      }
    }

    return { created };
  }

  private async setupLaunchConfigs(args: any): Promise<{ path: string }> {
    const { platform, output_path } = args;

    const launchPath = path.join(output_path, '.vscode', 'launch.json');
    await fs.ensureDir(path.dirname(launchPath));

    const config = this.getPlatformConfig(platform);
    const launchConfig = {
      version: '0.2.0',
      configurations: config.launchConfigs,
    };

    await fs.writeJson(launchPath, launchConfig, { spaces: 2 });

    return { path: launchPath };
  }

  private async organizeFiles(args: any): Promise<{ moved: number; structure: string[] }> {
    const { workspace_path, strategy } = args;

    // This is a simplified implementation
    // In production, would actually move files based on strategy
    
    const structure = [];
    let moved = 0;

    switch (strategy) {
      case 'by-feature':
        structure.push('features/', 'features/sales/', 'features/inventory/');
        break;
      case 'by-type':
        structure.push('models/', 'views/', 'controllers/');
        break;
      case 'by-layer':
        structure.push('presentation/', 'business/', 'data/');
        break;
    }

    return { moved, structure };
  }

  // ============================================
  // PLATFORM CONFIGURATIONS
  // ============================================

  private getPlatformConfig(platform: string): PlatformConfig {
    const configs: Record<string, PlatformConfig> = {
      fabric: {
        extensions: [
          'ms-python.python',
          'ms-mssql.mssql',
          'powerquery.vscode-powerquery',
          'ms-vscode.powershell',
        ],
        settings: {
          'editor.formatOnSave': true,
          'files.associations': {
            '*.dax': 'dax',
            '*.m': 'powerquery',
          },
        },
        snippets: {},
        tasks: [],
        launchConfigs: [
          {
            name: 'Python: Current File',
            type: 'python',
            request: 'launch',
            program: '${file}',
            console: 'integratedTerminal',
          },
        ],
      },
      databricks: {
        extensions: [
          'ms-python.python',
          'databricks.databricks',
          'ms-toolsai.jupyter',
        ],
        settings: {
          'python.defaultInterpreterPath': '/databricks/python3/bin/python3',
        },
        snippets: {},
        tasks: [],
        launchConfigs: [],
      },
      snowflake: {
        extensions: [
          'ms-python.python',
          'ms-mssql.mssql',
        ],
        settings: {},
        snippets: {},
        tasks: [],
        launchConfigs: [],
      },
    };

    return configs[platform] || configs.fabric;
  }

  private getPlatformSnippets(platform: string): Record<string, any> {
    return {
      sql: {
        'Select with CTE': {
          prefix: 'cte',
          body: [
            'WITH ${1:cte_name} AS (',
            '    SELECT ${2:columns}',
            '    FROM ${3:table}',
            '    WHERE ${4:condition}',
            ')',
            'SELECT *',
            'FROM ${1:cte_name};',
          ],
          description: 'Common Table Expression',
        },
      },
      python: {
        'PySpark DataFrame': {
          prefix: 'psdf',
          body: [
            'df = spark.read.format("${1:parquet}")',
            '    .load("${2:path}")',
            '    .select(${3:columns})',
            '    .where(${4:condition})',
          ],
          description: 'PySpark DataFrame read',
        },
      },
    };
  }

  private generateReadme(clientName: string, platform: string): string {
    return `# ${clientName} - ${platform.toUpperCase()} Project

## Overview

This is a ${platform} project for ${clientName}.

## Structure

- **src/**: Source code
- **docs/**: Documentation
- **tests/**: Test files
- **scripts/**: Utility scripts
- **data/**: Data files

## Getting Started

1. Install recommended extensions
2. Review platform-specific documentation
3. Configure credentials as needed

## Development

[Add development instructions here]

## Deployment

[Add deployment instructions here]
`;
  }

  private getGitignore(): string {
    return `# Python
__pycache__/
*.py[cod]
.venv/
venv/

# VS Code
.vscode/settings.json
.vscode/launch.json

# Data
*.csv
*.parquet
data/

# Credentials
*.key
*.pem
.env

# OS
.DS_Store
Thumbs.db
`;
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    this.logger.info('VS Code workspace server running on stdio');
  }
}

// Main entry point
async function main() {
  try {
    const config = await loadConfigFromEnv('CONFIG_PATH', {
      schema: ConfigSchema,
      defaults: {},
    });

    const server = new VSCodeWorkspaceServer(config);
    await server.run();
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();
