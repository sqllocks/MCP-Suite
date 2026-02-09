#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { createLogger, loadConfigFromEnv } from '@mcp-suite/shared';
import { Config, ConfigSchema } from './config.js';
import { GitHubSearcher } from './github-searcher.js';
import { LocalSearcher } from './local-searcher.js';

class CodeSearchServer {
  private server: Server;
  private config: Config;
  private logger: ReturnType<typeof createLogger>;
  private githubSearcher?: GitHubSearcher;
  private localSearcher: LocalSearcher;

  constructor(config: Config) {
    this.config = config;
    this.logger = createLogger({ name: 'mcp-code-search' });

    // Initialize GitHub searcher if token provided
    if (this.config.github_token) {
      this.githubSearcher = new GitHubSearcher(
        this.config.github_token,
        this.logger
      );
    } else {
      this.logger.warn('No GitHub token provided, GitHub search disabled');
    }

    // Initialize local searcher
    this.localSearcher = new LocalSearcher(
      this.config.client_repo_root,
      this.config.allowed_file_extensions,
      this.config.exclude_patterns,
      this.config.max_file_size_mb,
      this.logger
    );

    // Create MCP server
    this.server = new Server(
      {
        name: 'mcp-code-search',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
    this.logger.info(
      {
        client_id: this.config.client_id,
        repo_root: this.config.client_repo_root,
        github_enabled: !!this.githubSearcher,
      },
      'Code Search Server initialized'
    );
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools: Tool[] = [
        {
          name: 'search_repo',
          description: `Search local codebase (sandboxed to: ${this.config.client_repo_root})`,
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Search query',
              },
              file_glob: {
                type: 'string',
                description: 'File pattern (e.g., "**/*.sql")',
                default: '**/*',
              },
              context_lines: {
                type: 'number',
                description: 'Lines of context before/after match',
                default: 3,
              },
              max_results: {
                type: 'number',
                description: 'Maximum results to return',
                default: 10,
              },
            },
            required: ['query'],
          },
        },
        {
          name: 'get_file',
          description: 'Read file contents (read-only, path validated)',
          inputSchema: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: 'File path relative to repo root',
              },
            },
            required: ['path'],
          },
        },
        {
          name: 'get_file_structure',
          description: 'Get directory tree structure',
          inputSchema: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: 'Directory path (default: root)',
                default: '',
              },
              depth: {
                type: 'number',
                description: 'Maximum depth to traverse',
                default: 3,
              },
            },
          },
        },
      ];

      // Add GitHub tools if available
      if (this.githubSearcher) {
        tools.push({
          name: 'github_code_search',
          description: 'Search GitHub for code samples',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Search query',
              },
              repo: {
                type: 'string',
                description: 'Repository (owner/repo)',
              },
              language: {
                type: 'string',
                description: 'Programming language filter',
              },
              path: {
                type: 'string',
                description: 'Path filter',
              },
            },
            required: ['query'],
          },
        });
      }

      return { tools };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'search_repo':
            return await this.handleSearchRepo(args);
          case 'get_file':
            return await this.handleGetFile(args);
          case 'get_file_structure':
            return await this.handleGetFileStructure(args);
          case 'github_code_search':
            return await this.handleGitHubSearch(args);
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

  private async handleSearchRepo(args: any) {
    const {
      query,
      file_glob = '**/*',
      context_lines = 3,
      max_results = 10,
    } = args;

    this.logger.info({ query, file_glob }, 'Searching local repository');

    const results = await this.localSearcher.searchRepo({
      query,
      fileGlob: file_glob,
      contextLines: context_lines,
      maxResults: Math.min(max_results, this.config.max_code_results),
      caseSensitive: this.config.case_sensitive,
      useRegex: this.config.use_regex,
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(results, null, 2),
        },
      ],
    };
  }

  private async handleGetFile(args: any) {
    const { path } = args;

    this.logger.info({ path }, 'Reading file');

    const content = await this.localSearcher.readFile(path);
    const metadata = await this.localSearcher.getFileMetadata(path);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              path,
              content,
              metadata,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async handleGetFileStructure(args: any) {
    const { path = '', depth = 3 } = args;

    this.logger.info({ path, depth }, 'Getting file structure');

    const structure = await this.localSearcher.getFileStructure(path, depth);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(structure, null, 2),
        },
      ],
    };
  }

  private async handleGitHubSearch(args: any) {
    if (!this.githubSearcher) {
      throw new Error('GitHub search not available (no token configured)');
    }

    const { query, repo, language, path } = args;

    this.logger.info({ query, repo, language }, 'Searching GitHub');

    const results = await this.githubSearcher.searchCode({
      query,
      repo,
      language,
      path,
      maxResults: this.config.max_code_results,
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(results, null, 2),
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
    // Load config from environment variable
    const config = await loadConfigFromEnv('CONFIG_PATH', {
      schema: ConfigSchema,
      defaults: {},
    });

    // Create and run server
    const server = new CodeSearchServer(config);
    await server.run();
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();
