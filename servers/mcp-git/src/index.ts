#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { createLogger, loadConfigFromEnv } from '@mcp-suite/shared';
import { Config, ConfigSchema, GitCommit, FileHistoryEntry, SimilarCodeMatch, RecentChange, BranchComparison } from './config.js';
import { simpleGit, SimpleGit, LogResult } from 'simple-git';
import * as path from 'path';
import * as fs from 'fs';
import parseDiff from 'parse-diff';

class GitServer {
  private server: Server;
  private config: Config;
  private logger: ReturnType<typeof createLogger>;
  private gitInstances: Map<string, SimpleGit> = new Map();

  constructor(config: Config) {
    this.config = config;
    this.logger = createLogger({ name: 'mcp-git' });

    // Initialize git instances for each repo
    for (const repoRoot of this.config.repo_roots) {
      if (fs.existsSync(repoRoot)) {
        const git = simpleGit(repoRoot);
        this.gitInstances.set(repoRoot, git);
        this.logger.info({ repo: repoRoot }, 'Initialized git repository');
      } else {
        this.logger.warn({ repo: repoRoot }, 'Repository path does not exist');
      }
    }

    // Create MCP server
    this.server = new Server(
      {
        name: 'mcp-git',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
    this.logger.info({ client_id: this.config.client_id, repos: this.config.repo_roots.length }, 'Git server initialized');
  }

  private validatePath(repoPath: string, filePath?: string): { repo: string; git: SimpleGit } {
    // Find matching repo root
    const repo = this.config.repo_roots.find(root => repoPath.startsWith(root) || repoPath === root);
    if (!repo) {
      throw new Error(`Path ${repoPath} is not within configured repo roots`);
    }

    const git = this.gitInstances.get(repo);
    if (!git) {
      throw new Error(`Git instance not found for ${repo}`);
    }

    // If file path provided, ensure it's within repo
    if (filePath) {
      const fullPath = path.resolve(repo, filePath);
      if (!fullPath.startsWith(repo)) {
        throw new Error(`File path escapes repository: ${filePath}`);
      }
    }

    return { repo, git };
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools: Tool[] = [
        {
          name: 'git_search_history',
          description: 'Search git commit history for patterns in messages or file changes',
          inputSchema: {
            type: 'object',
            properties: {
              pattern: {
                type: 'string',
                description: 'Search pattern (regex supported)',
              },
              repo: {
                type: 'string',
                description: 'Repository path (optional, searches all if not provided)',
              },
              file_type: {
                type: 'string',
                description: 'Filter by file extension (e.g., ".sql", ".py")',
              },
              author: {
                type: 'string',
                description: 'Filter by author name or email',
              },
              since: {
                type: 'string',
                description: 'Only show commits since date (ISO format: 2024-01-01)',
              },
              max_results: {
                type: 'number',
                description: 'Maximum results to return',
                default: 50,
              },
            },
            required: ['pattern'],
          },
        },
        {
          name: 'git_get_file_history',
          description: 'Get the commit history for a specific file with diffs',
          inputSchema: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: 'File path relative to repository root',
              },
              repo: {
                type: 'string',
                description: 'Repository path (required if multiple repos)',
              },
              limit: {
                type: 'number',
                description: 'Number of commits to retrieve',
                default: 10,
              },
            },
            required: ['path'],
          },
        },
        {
          name: 'git_find_similar_code',
          description: 'Find similar code snippets in repository history',
          inputSchema: {
            type: 'object',
            properties: {
              snippet: {
                type: 'string',
                description: 'Code snippet to search for',
              },
              repo: {
                type: 'string',
                description: 'Repository path (optional)',
              },
              similarity_threshold: {
                type: 'number',
                description: 'Similarity threshold (0.0-1.0)',
                default: 0.8,
              },
            },
            required: ['snippet'],
          },
        },
        {
          name: 'git_get_recent_changes',
          description: 'Get recent commits with file change statistics',
          inputSchema: {
            type: 'object',
            properties: {
              repo: {
                type: 'string',
                description: 'Repository path (optional)',
              },
              author: {
                type: 'string',
                description: 'Filter by author',
              },
              days: {
                type: 'number',
                description: 'Number of days to look back',
                default: 7,
              },
              max_results: {
                type: 'number',
                description: 'Maximum results',
                default: 50,
              },
            },
          },
        },
        {
          name: 'git_compare_branches',
          description: 'Compare two branches showing commits ahead/behind',
          inputSchema: {
            type: 'object',
            properties: {
              base: {
                type: 'string',
                description: 'Base branch name',
              },
              compare: {
                type: 'string',
                description: 'Branch to compare',
              },
              repo: {
                type: 'string',
                description: 'Repository path (required if multiple repos)',
              },
            },
            required: ['base', 'compare'],
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
          case 'git_search_history':
            result = await this.searchHistory(args);
            break;
          case 'git_get_file_history':
            result = await this.getFileHistory(args);
            break;
          case 'git_find_similar_code':
            result = await this.findSimilarCode(args);
            break;
          case 'git_get_recent_changes':
            result = await this.getRecentChanges(args);
            break;
          case 'git_compare_branches':
            result = await this.compareBranches(args);
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

  private async searchHistory(args: any): Promise<GitCommit[]> {
    const { pattern, repo, file_type, author, since, max_results = 50 } = args;
    const results: GitCommit[] = [];

    // Determine which repos to search
    const reposToSearch = repo ? [repo] : this.config.repo_roots;

    for (const repoPath of reposToSearch) {
      const git = this.gitInstances.get(repoPath);
      if (!git) continue;

      try {
        // Build log options
        const logOptions: any = {
          maxCount: max_results,
          '--grep': pattern,
          '--regexp-ignore-case': null,
        };

        if (author) {
          logOptions['--author'] = author;
        }

        if (since) {
          logOptions['--since'] = since;
        }

        if (file_type) {
          logOptions['--'] = `*${file_type}`;
        }

        const log = await git.log(logOptions);

        for (const commit of log.all) {
          // Get files changed in this commit
          const show = await git.show([commit.hash, '--name-only', '--format=']);
          const files = show.split('\n').filter(f => f.trim());

          results.push({
            commit: commit.hash,
            message: commit.message,
            author: commit.author_name,
            date: commit.date,
            files: files,
          });

          if (results.length >= max_results) break;
        }
      } catch (error) {
        this.logger.warn({ repo: repoPath, error }, 'Failed to search repository');
      }
    }

    return results.slice(0, max_results);
  }

  private async getFileHistory(args: any): Promise<FileHistoryEntry[]> {
    const { path: filePath, repo, limit = 10 } = args;

    // If repo not specified, try to find the file
    let repoPath = repo;
    if (!repoPath) {
      for (const root of this.config.repo_roots) {
        const fullPath = path.join(root, filePath);
        if (fs.existsSync(fullPath)) {
          repoPath = root;
          break;
        }
      }
      if (!repoPath) {
        throw new Error(`File not found in any repository: ${filePath}`);
      }
    }

    const { git } = this.validatePath(repoPath, filePath);

    // Get file history
    const log = await git.log({ file: filePath, maxCount: limit });
    const history: FileHistoryEntry[] = [];

    for (const commit of log.all) {
      try {
        // Get diff for this file in this commit
        const diff = await git.diff([`${commit.hash}^`, commit.hash, '--', filePath]);

        history.push({
          commit: commit.hash,
          date: commit.date,
          author: commit.author_name,
          message: commit.message,
          diff: diff,
        });
      } catch (error) {
        // First commit won't have a parent
        history.push({
          commit: commit.hash,
          date: commit.date,
          author: commit.author_name,
          message: commit.message,
          diff: '(initial commit)',
        });
      }
    }

    return history;
  }

  private async findSimilarCode(args: any): Promise<SimilarCodeMatch[]> {
    const { snippet, repo, similarity_threshold = 0.8 } = args;
    const results: SimilarCodeMatch[] = [];

    // Simple implementation: search for the snippet in current codebase
    // In a production version, this would use more sophisticated fuzzy matching
    const reposToSearch = repo ? [repo] : this.config.repo_roots;

    for (const repoPath of reposToSearch) {
      const git = this.gitInstances.get(repoPath);
      if (!git) continue;

      try {
        // Search for lines containing parts of the snippet
        const snippetLines = snippet.split('\n').filter(l => l.trim());
        if (snippetLines.length === 0) continue;

        const searchTerm = snippetLines[0].trim();
        const grepResult = await git.raw(['grep', '-n', searchTerm]);

        const matches = grepResult.split('\n').filter(l => l.trim());
        for (const match of matches) {
          const [file, ...rest] = match.split(':');
          results.push({
            file: file,
            commit: 'HEAD',
            similarity: 0.9, // Simplified similarity
            snippet: rest.join(':'),
          });
        }
      } catch (error) {
        // grep returns non-zero if no matches, ignore
      }
    }

    return results.filter(r => r.similarity >= similarity_threshold);
  }

  private async getRecentChanges(args: any): Promise<RecentChange[]> {
    const { repo, author, days = 7, max_results = 50 } = args;
    const results: RecentChange[] = [];

    const reposToSearch = repo ? [repo] : this.config.repo_roots;
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);

    for (const repoPath of reposToSearch) {
      const git = this.gitInstances.get(repoPath);
      if (!git) continue;

      try {
        const logOptions: any = {
          maxCount: max_results,
          '--since': sinceDate.toISOString(),
          '--numstat': null,
        };

        if (author) {
          logOptions['--author'] = author;
        }

        const log = await git.log(logOptions);

        for (const commit of log.all) {
          // Get detailed stats
          const stats = await git.show([
            commit.hash,
            '--numstat',
            '--format=%n',
          ]);

          const lines = stats.split('\n').filter(l => l.trim());
          let additions = 0;
          let deletions = 0;
          const files: string[] = [];

          for (const line of lines) {
            const parts = line.split('\t');
            if (parts.length === 3) {
              const [add, del, file] = parts;
              additions += parseInt(add) || 0;
              deletions += parseInt(del) || 0;
              files.push(file);
            }
          }

          results.push({
            commit: commit.hash,
            message: commit.message,
            files: files,
            additions: additions,
            deletions: deletions,
            date: commit.date,
            author: commit.author_name,
          });

          if (results.length >= max_results) break;
        }
      } catch (error) {
        this.logger.warn({ repo: repoPath, error }, 'Failed to get recent changes');
      }
    }

    return results.slice(0, max_results);
  }

  private async compareBranches(args: any): Promise<BranchComparison> {
    const { base, compare, repo } = args;

    if (!repo && this.config.repo_roots.length > 1) {
      throw new Error('Repository path required when multiple repos configured');
    }

    const repoPath = repo || this.config.repo_roots[0];
    const { git } = this.validatePath(repoPath);

    // Get commits ahead (in compare but not in base)
    const aheadLog = await git.log([`${base}..${compare}`]);
    const ahead = aheadLog.all.length;

    // Get commits behind (in base but not in compare)
    const behindLog = await git.log([`${compare}..${base}`]);
    const behind = behindLog.all.length;

    // Get files changed
    const diff = await git.diffSummary([base, compare]);
    const files_changed = diff.files.length;

    // Get detailed commits
    const commits: GitCommit[] = aheadLog.all.map(c => ({
      commit: c.hash,
      message: c.message,
      author: c.author_name,
      date: c.date,
    }));

    return {
      ahead,
      behind,
      files_changed,
      commits,
    };
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    this.logger.info('Git server running on stdio');
  }
}

// Main entry point
async function main() {
  try {
    const config = await loadConfigFromEnv('CONFIG_PATH', {
      schema: ConfigSchema,
      defaults: { repo_roots: [] },
    });

    if (config.repo_roots.length === 0) {
      throw new Error('At least one repo_root must be configured');
    }

    const server = new GitServer(config);
    await server.run();
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();
