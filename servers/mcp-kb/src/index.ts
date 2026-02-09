#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { createLogger, loadConfig } from '@mcp-suite/shared';
import { Config, ConfigSchema, KnowledgeEntry, SearchResult } from './config.js';
import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';
import { glob } from 'glob';
import crypto from 'crypto';

class KnowledgeBaseServer {
  private server: Server;
  private config: Config;
  private logger: ReturnType<typeof createLogger>;
  private entries: Map<string, KnowledgeEntry> = new Map();

  constructor(config: Config) {
    this.config = config;
    this.logger = createLogger({ name: 'mcp-kb' });

    // Create MCP server
    this.server = new Server(
      {
        name: 'mcp-kb',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
    this.logger.info({ kb_root: this.config.kb_root }, 'Knowledge Base Server initialized');
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools: Tool[] = [
        {
          name: 'kb_search',
          description: 'Search knowledge base',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Search query',
              },
              client: {
                type: 'string',
                description: 'Filter by client (optional)',
              },
              category: {
                type: 'string',
                enum: this.config.categories,
                description: 'Filter by category (optional)',
              },
              top_k: {
                type: 'number',
                description: 'Number of results to return',
                default: 5,
              },
            },
            required: ['query'],
          },
        },
        {
          name: 'kb_add',
          description: 'Add new knowledge entry',
          inputSchema: {
            type: 'object',
            properties: {
              title: {
                type: 'string',
                description: 'Entry title',
              },
              content: {
                type: 'string',
                description: 'Entry content (markdown)',
              },
              tags: {
                type: 'array',
                items: { type: 'string' },
                description: 'Tags',
              },
              client: {
                type: 'string',
                description: 'Associated client (optional)',
              },
              category: {
                type: 'string',
                enum: this.config.categories,
                description: 'Category',
              },
            },
            required: ['title', 'content', 'category'],
          },
        },
        {
          name: 'kb_get_runbook',
          description: 'Get specific runbook by topic',
          inputSchema: {
            type: 'object',
            properties: {
              topic: {
                type: 'string',
                description: 'Runbook topic',
              },
            },
            required: ['topic'],
          },
        },
        {
          name: 'kb_list_patterns',
          description: 'List available patterns',
          inputSchema: {
            type: 'object',
            properties: {
              category: {
                type: 'string',
                description: 'Filter by category (optional)',
              },
            },
          },
        },
        {
          name: 'kb_similar_issues',
          description: 'Find similar past issues/solutions',
          inputSchema: {
            type: 'object',
            properties: {
              description: {
                type: 'string',
                description: 'Issue description',
              },
              client: {
                type: 'string',
                description: 'Filter by client (optional)',
              },
            },
            required: ['description'],
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
          case 'kb_search':
            return await this.handleSearch(args);
          case 'kb_add':
            return await this.handleAdd(args);
          case 'kb_get_runbook':
            return await this.handleGetRunbook(args);
          case 'kb_list_patterns':
            return await this.handleListPatterns(args);
          case 'kb_similar_issues':
            return await this.handleSimilarIssues(args);
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

  private async handleSearch(args: any) {
    const { query, client, category, top_k = 5 } = args;

    this.logger.info({ query, client, category }, 'Searching knowledge base');

    // Load entries
    await this.loadEntries();

    // Filter and search
    const results = this.searchEntries(query, client, category, top_k);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(results, null, 2),
        },
      ],
    };
  }

  private async handleAdd(args: any) {
    const { title, content, tags = [], client, category } = args;

    this.logger.info({ title, category }, 'Adding knowledge entry');

    // Generate ID
    const id = crypto.randomBytes(8).toString('hex');

    // Create entry
    const entry: KnowledgeEntry = {
      id,
      title,
      content,
      category,
      tags,
      client,
      path: '',
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      metadata: {},
    };

    // Determine file path
    const categoryDir = path.join(this.config.kb_root, category);
    await fs.mkdir(categoryDir, { recursive: true });

    const filename = `${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}.md`;
    const filepath = path.join(categoryDir, filename);

    // Create frontmatter content
    const frontmatter = {
      id,
      title,
      category,
      tags,
      client,
      created: entry.created,
      modified: entry.modified,
    };

    const fileContent = matter.stringify(content, frontmatter);

    // Write file
    await fs.writeFile(filepath, fileContent, 'utf-8');

    entry.path = filepath;

    this.logger.info({ filepath }, 'Knowledge entry added');

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ id, filepath }, null, 2),
        },
      ],
    };
  }

  private async handleGetRunbook(args: any) {
    const { topic } = args;

    this.logger.info({ topic }, 'Getting runbook');

    // Load entries
    await this.loadEntries();

    // Find runbook
    const runbooks = Array.from(this.entries.values()).filter(
      (e) => e.category === 'runbooks' && 
      e.title.toLowerCase().includes(topic.toLowerCase())
    );

    if (runbooks.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `No runbook found for topic: ${topic}`,
          },
        ],
      };
    }

    const runbook = runbooks[0];

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(runbook, null, 2),
        },
      ],
    };
  }

  private async handleListPatterns(args: any) {
    const { category } = args;

    this.logger.info({ category }, 'Listing patterns');

    // Load entries
    await this.loadEntries();

    // Filter patterns
    const patterns = Array.from(this.entries.values()).filter(
      (e) => e.category === 'patterns' && 
      (!category || e.metadata.pattern_category === category)
    );

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            patterns.map((p) => ({
              name: p.title,
              description: p.metadata.description || '',
              path: p.path,
            })),
            null,
            2
          ),
        },
      ],
    };
  }

  private async handleSimilarIssues(args: any) {
    const { description, client } = args;

    this.logger.info({ client }, 'Finding similar issues');

    // Load entries
    await this.loadEntries();

    // Search for similar issues in lessons-learned
    const results = this.searchEntries(description, client, 'lessons-learned', 5);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(results, null, 2),
        },
      ],
    };
  }

  private async loadEntries(): Promise<void> {
    this.entries.clear();

    const pattern = path.join(this.config.kb_root, '**', '*.md');
    const files = await glob(pattern);

    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        const parsed = matter(content);

        const stats = await fs.stat(file);

        const entry: KnowledgeEntry = {
          id: parsed.data.id || path.basename(file, '.md'),
          title: parsed.data.title || path.basename(file, '.md'),
          content: parsed.content,
          category: parsed.data.category || 'uncategorized',
          tags: parsed.data.tags || [],
          client: parsed.data.client,
          path: file,
          created: parsed.data.created || stats.birthtime.toISOString(),
          modified: parsed.data.modified || stats.mtime.toISOString(),
          metadata: parsed.data,
        };

        this.entries.set(entry.id, entry);
      } catch (error) {
        this.logger.warn({ file, error }, 'Failed to load entry');
      }
    }

    this.logger.info({ count: this.entries.size }, 'Entries loaded');
  }

  private searchEntries(
    query: string,
    client?: string,
    category?: string,
    topK: number = 5
  ): SearchResult[] {
    const queryLower = query.toLowerCase();
    const results: SearchResult[] = [];

    for (const entry of this.entries.values()) {
      // Filter by client
      if (client && entry.client !== client) {
        continue;
      }

      // Filter by category
      if (category && entry.category !== category) {
        continue;
      }

      // Calculate score
      let score = 0;
      const matchedFields: string[] = [];

      // Title match (high weight)
      if (entry.title.toLowerCase().includes(queryLower)) {
        score += 10;
        matchedFields.push('title');
      }

      // Content match (medium weight)
      if (entry.content.toLowerCase().includes(queryLower)) {
        score += 5;
        matchedFields.push('content');
      }

      // Tag match (medium weight)
      if (entry.tags.some((tag) => tag.toLowerCase().includes(queryLower))) {
        score += 7;
        matchedFields.push('tags');
      }

      if (score > 0) {
        results.push({ entry, score, matchedFields });
      }
    }

    // Sort by score
    results.sort((a, b) => b.score - a.score);

    // Return top K
    return results.slice(0, topK);
  }

  async initialize(): Promise<void> {
    // Create knowledge base directory if it doesn't exist
    await fs.mkdir(this.config.kb_root, { recursive: true });

    for (const category of this.config.categories) {
      const categoryDir = path.join(this.config.kb_root, category);
      await fs.mkdir(categoryDir, { recursive: true });
    }

    this.logger.info('Knowledge base initialized');
  }

  async run(): Promise<void> {
    await this.initialize();
    
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    this.logger.info('Server running on stdio');
  }
}

// Main entry point
async function main() {
  try {
    const config: Config = ConfigSchema.parse({});

    const server = new KnowledgeBaseServer(config);
    await server.run();
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();
