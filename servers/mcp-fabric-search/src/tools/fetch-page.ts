import fetch from 'node-fetch';
import type { SearchConfig, FetchPageParams, PageContent } from '../types/index.js';
import {
  Cache,
  createCacheKey,
  htmlToMarkdown,
  extractMetadata,
  countWords,
  logger,
} from '../utils/index.js';

/**
 * Fetch page tool implementation
 */
export class FetchPageTool {
  private config: SearchConfig;
  private cache: Cache<PageContent>;

  constructor(config: SearchConfig) {
    this.config = config;
    this.cache = new Cache<PageContent>({
      max: 500,
      ttl: config.cache_ttl,
    });
  }

  /**
   * Fetch and clean page content
   */
  async fetchPage(params: FetchPageParams): Promise<PageContent> {
    const { url } = params;

    // Create cache key
    const cacheKey = createCacheKey('fetch_page', url);

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached) {
      logger.info({ url, cached: true }, 'Returning cached page content');
      return cached;
    }

    logger.info({ url }, 'Fetching page content');

    try {
      // Fetch HTML
      const response = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (compatible; MCPFabricSearch/1.0; +https://github.com/yourorg/mcp-suite)',
        },
        timeout: 10000, // 10 second timeout
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();

      // Extract metadata
      const metadata = extractMetadata(html);

      // Convert to markdown
      const markdown = await htmlToMarkdown(html, url);

      // Calculate word count
      const wordCount = countWords(markdown);

      // Build result
      const result: PageContent = {
        url,
        content: markdown,
        metadata: {
          title: metadata.title,
          author: metadata.author,
          publishDate: metadata.publishDate,
          wordCount,
        },
      };

      // Cache result
      this.cache.set(cacheKey, result);

      logger.info(
        { url, wordCount, cached: false },
        'Page fetched and converted successfully'
      );

      return result;
    } catch (error) {
      logger.error({ error, url }, 'Failed to fetch page');
      throw new Error(`Failed to fetch page: ${error}`);
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.cache.getStats();
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }
}
