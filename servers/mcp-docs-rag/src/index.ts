#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { createLogger, loadConfigFromEnv } from '@mcp-suite/shared';
import { Config, ConfigSchema, SearchResult } from './config.js';
import { VectorStore } from './vector-store.js';
import { EmbeddingService, MockEmbeddingService } from './embedding-service.js';

class DocsRAGServer {
  private server: Server;
  private config: Config;
  private logger: ReturnType<typeof createLogger>;
  private vectorStore: VectorStore;
  private embeddingService: EmbeddingService | MockEmbeddingService;

  constructor(config: Config) {
    this.config = config;
    this.logger = createLogger({ name: 'mcp-docs-rag' });

    // Initialize vector store
    this.vectorStore = new VectorStore(this.config.index_path, this.logger);

    // Initialize embedding service
    if (this.config.embedding_provider === 'openai' && this.config.openai_api_key) {
      this.embeddingService = new EmbeddingService(
        this.config.openai_api_key,
        this.config.embedding_model,
        this.logger
      );
      this.logger.info('Using OpenAI embedding service');
    } else {
      this.embeddingService = new MockEmbeddingService();
      this.logger.warn('Using mock embedding service (no OpenAI key provided)');
    }

    // Create MCP server
    this.server = new Server(
      {
        name: 'mcp-docs-rag',
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
        platform: this.config.platform,
        index_path: this.config.index_path,
      },
      'Docs RAG Server initialized'
    );
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const docSets = this.vectorStore.getDocSets();
      
      const tools: Tool[] = [
        {
          name: 'doc_search',
          description: `Semantic search across indexed documentation. Available doc sets: ${docSets.join(', ')}`,
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Search query',
              },
              doc_set: {
                type: 'string',
                description: 'Filter by documentation set',
                enum: docSets.length > 0 ? docSets : undefined,
              },
              top_k: {
                type: 'number',
                description: 'Number of results to return',
                default: 5,
              },
              include_sources: {
                type: 'boolean',
                description: 'Include source URLs',
                default: true,
              },
            },
            required: ['query'],
          },
        },
        {
          name: 'doc_get_stats',
          description: 'Get statistics about indexed documentation',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'doc_list_sets',
          description: 'List available documentation sets',
          inputSchema: {
            type: 'object',
            properties: {},
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
          case 'doc_search':
            return await this.handleDocSearch(args);
          case 'doc_get_stats':
            return await this.handleGetStats(args);
          case 'doc_list_sets':
            return await this.handleListSets(args);
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

  private async handleDocSearch(args: any) {
    const { query, doc_set, top_k = 5, include_sources = true } = args;

    this.logger.info({ query, doc_set, top_k }, 'Searching documentation');

    // Generate query embedding
    const queryEmbedding = await this.embeddingService.generateEmbedding(query);

    // Search vector store
    const results = await this.vectorStore.search(
      queryEmbedding,
      Math.min(top_k, this.config.top_k),
      doc_set,
      this.config.similarity_threshold
    );

    // Format results
    const formattedResults = results.map((result) => {
      const formatted: any = {
        content: result.content,
        score: result.score,
        title: result.title,
      };

      if (include_sources) {
        formatted.source = result.source;
        formatted.url = result.metadata.url;
      }

      if (result.metadata.section) {
        formatted.section = result.metadata.section;
      }

      return formatted;
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(formattedResults, null, 2),
        },
      ],
    };
  }

  private async handleGetStats(args: any) {
    this.logger.info('Getting index statistics');

    const stats = this.vectorStore.getStats();

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(stats, null, 2),
        },
      ],
    };
  }

  private async handleListSets(args: any) {
    this.logger.info('Listing documentation sets');

    const docSets = this.vectorStore.getDocSets();

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ doc_sets: docSets }, null, 2),
        },
      ],
    };
  }

  async initialize(): Promise<void> {
    // Load existing index if available
    const indexExists = await this.vectorStore.exists();
    
    if (indexExists) {
      await this.vectorStore.load();
      this.logger.info('Loaded existing documentation index');
    } else {
      this.logger.warn(
        'No index found. Run the indexer to create one: npm run index'
      );
    }
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
    // Load config from environment variable
    const config = await loadConfigFromEnv('CONFIG_PATH', {
      schema: ConfigSchema,
      defaults: {},
    });

    // Create and run server
    const server = new DocsRAGServer(config);
    await server.run();
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();
