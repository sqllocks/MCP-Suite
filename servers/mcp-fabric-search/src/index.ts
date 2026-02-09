#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { createLogger, loadConfigFromEnv, LRUCache, RateLimiter } from '@mcp-suite/shared';
import { Config, ConfigSchema, mergeWithPreset } from './config.js';
import { SearchBackend, SearchOptions } from './search-backend.js';
import { SerpAPIBackend } from './serpapi-backend.js';
import { PageFetcher } from './page-fetcher.js';

class FabricSearchServer {
  private server: Server;
  private config: Config;
  private logger: ReturnType<typeof createLogger>;
  private searchBackend: SearchBackend;
  private pageFetcher: PageFetcher;
  private cache: LRUCache<string, any>;
  private rateLimiter: RateLimiter;

  constructor(config: Config) {
    this.config = config;
    this.logger = createLogger({ name: 'mcp-fabric-search' });
    
    // Initialize cache
    this.cache = new LRUCache(this.config.max_cache_size, this.config.cache_ttl);
    
    // Initialize rate limiter
    this.rateLimiter = new RateLimiter(
      this.config.rate_limit_per_minute,
      this.config.rate_limit_per_minute
    );

    // Initialize search backend
    if (this.config.search_api_key) {
      this.searchBackend = new SerpAPIBackend(
        this.config.search_api_key,
        this.config.search_api_base,
        this.logger
      );
    } else {
      throw new Error('Search API key is required');
    }

    // Initialize page fetcher
    this.pageFetcher = new PageFetcher(this.logger);

    // Create MCP server
    this.server = new Server(
      {
        name: 'mcp-fabric-search',
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
        platform: this.config.platform 
      },
      'Fabric Search Server initialized'
    );
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools: Tool[] = [
        {
          name: 'web_search',
          description: `Search for ${this.config.platform} documentation, blogs, and resources. Biased towards: ${this.config.preferred_domains.join(', ')}`,
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Search query',
              },
              top_k: {
                type: 'number',
                description: 'Number of results to return (default: 5)',
                default: 5,
              },
              date_range: {
                type: 'string',
                enum: ['last_week', 'last_month', 'last_year', 'any'],
                description: 'Filter by publication date',
                default: 'any',
              },
              content_type: {
                type: 'string',
                enum: ['documentation', 'blog', 'video', 'forum', 'any'],
                description: 'Type of content to search for',
                default: 'any',
              },
            },
            required: ['query'],
          },
        },
        {
          name: 'fetch_page',
          description: 'Fetch and clean content from a web page, converting to markdown',
          inputSchema: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                description: 'URL of the page to fetch',
              },
            },
            required: ['url'],
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
          case 'web_search':
            return await this.handleWebSearch(args);
          case 'fetch_page':
            return await this.handleFetchPage(args);
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

  private async handleWebSearch(args: any) {
    const { query, top_k = 5, date_range = 'any', content_type = 'any' } = args;

    // Check rate limit
    if (!(await this.rateLimiter.tryConsume())) {
      throw new Error('Rate limit exceeded. Please wait before making more requests.');
    }

    // Check cache
    const cacheKey = `search:${query}:${top_k}:${date_range}:${content_type}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      this.logger.info({ query }, 'Returning cached search results');
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(cached, null, 2),
          },
        ],
      };
    }

    this.logger.info({ query, top_k, date_range, content_type }, 'Performing web search');

    // Perform search
    const searchOptions: SearchOptions = {
      query,
      topK: Math.min(top_k, this.config.max_results),
      dateRange: date_range,
      contentType: content_type,
      domains: this.config.strict_domains ? this.config.preferred_domains : undefined,
    };

    const results = await this.searchBackend.search(searchOptions);

    // If strict domains and no results, try without domain filter
    if (this.config.strict_domains && results.length === 0) {
      this.logger.info({ query }, 'No results with strict domains, trying broader search');
      searchOptions.domains = undefined;
      const broaderResults = await this.searchBackend.search(searchOptions);
      results.push(...broaderResults);
    }

    // Score and sort by domain preference
    const scoredResults = results.map((result) => {
      let score = result.relevanceScore || 0.5;
      
      // Boost preferred domains
      const domain = result.sourceDomain;
      const domainIndex = this.config.preferred_domains.findIndex((d) =>
        domain.includes(d)
      );
      
      if (domainIndex >= 0) {
        score += 0.5 - domainIndex * 0.05;
      }

      return { ...result, relevanceScore: score };
    });

    // Sort by score
    scoredResults.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));

    // Take top K
    const finalResults = scoredResults.slice(0, top_k);

    // Cache results
    this.cache.set(cacheKey, finalResults);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(finalResults, null, 2),
        },
      ],
    };
  }

  private async handleFetchPage(args: any) {
    const { url } = args;

    // Check cache
    const cacheKey = `page:${url}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      this.logger.info({ url }, 'Returning cached page');
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(cached, null, 2),
          },
        ],
      };
    }

    this.logger.info({ url }, 'Fetching page');

    const page = await this.pageFetcher.fetchPage(url);

    // Cache result
    this.cache.set(cacheKey, page);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(page, null, 2),
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

    // Merge with platform preset
    const mergedConfig = mergeWithPreset(config);

    // Create and run server
    const server = new FabricSearchServer(mergedConfig);
    await server.run();
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();
