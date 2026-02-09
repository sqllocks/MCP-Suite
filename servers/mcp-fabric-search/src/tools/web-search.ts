import fetch from 'node-fetch';
import type { SearchConfig, WebSearchParams, SearchResult, SearchBackendResponse } from '../types/index.js';
import {
  Cache,
  createCacheKey,
  enhanceQuery,
  extractDomain,
  calculateRelevanceScore,
  sortByRelevance,
  logger,
} from '../utils/index.js';

/**
 * Web search tool implementation
 */
export class WebSearchTool {
  private config: SearchConfig;
  private cache: Cache<SearchResult[]>;

  constructor(config: SearchConfig) {
    this.config = config;
    this.cache = new Cache<SearchResult[]>({
      max: 1000,
      ttl: config.cache_ttl,
    });
  }

  /**
   * Execute web search with caching and rate limiting
   */
  async search(params: WebSearchParams): Promise<SearchResult[]> {
    const { query, top_k = this.config.max_results, date_range, content_type } = params;

    // Create cache key
    const cacheKey = createCacheKey('web_search', query, top_k, date_range, content_type);

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached) {
      logger.info({ query, cached: true }, 'Returning cached search results');
      return cached;
    }

    // Enhance query with platform-specific terms
    const enhancedQuery = enhanceQuery(query, this.config, content_type);

    logger.info(
      { originalQuery: query, enhancedQuery, platform: this.config.platform },
      'Executing web search'
    );

    try {
      // Call search API
      const results = await this.callSearchAPI(enhancedQuery, top_k, date_range);

      // Calculate relevance scores
      const scoredResults = results.map((result) => ({
        ...result,
        relevanceScore: calculateRelevanceScore(result.url, this.config.preferred_domains),
      }));

      // Sort by relevance
      const sorted = sortByRelevance(scoredResults);

      // Filter by strict domains if enabled
      const filtered = this.config.strict_domains
        ? sorted.filter((r) => {
            const domain = extractDomain(r.url);
            return this.config.preferred_domains.some(
              (d) => domain === d || domain.endsWith(`.${d}`)
            );
          })
        : sorted;

      // Limit results
      const limited = filtered.slice(0, top_k);

      // Cache results
      this.cache.set(cacheKey, limited);

      logger.info({ query, resultsCount: limited.length }, 'Search completed successfully');

      return limited;
    } catch (error) {
      logger.error({ error, query }, 'Search failed');
      throw new Error(`Web search failed: ${error}`);
    }
  }

  /**
   * Call search API backend
   */
  private async callSearchAPI(
    query: string,
    maxResults: number,
    dateRange?: string
  ): Promise<SearchResult[]> {
    // Build API URL (supports SerpAPI format)
    const url = new URL(this.config.search_api_base);
    url.searchParams.set('q', query);
    url.searchParams.set('num', String(maxResults));
    url.searchParams.set('api_key', this.config.search_api_key);

    // Add date range if specified
    if (dateRange && dateRange !== 'all') {
      const dateParam = this.convertDateRange(dateRange);
      if (dateParam) {
        url.searchParams.set('tbs', dateParam);
      }
    }

    // Make request
    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`Search API returned ${response.status}: ${response.statusText}`);
    }

    const data = (await response.json()) as SearchBackendResponse;

    // Parse results
    return this.parseSearchResponse(data);
  }

  /**
   * Parse search API response
   */
  private parseSearchResponse(data: SearchBackendResponse): SearchResult[] {
    if (!data.results || !Array.isArray(data.results)) {
      return [];
    }

    return data.results.map((item) => ({
      title: item.title || '',
      url: item.link || '',
      snippet: item.snippet || '',
      sourceDomain: item.displayLink || extractDomain(item.link || ''),
      publishedDate: item.date,
    }));
  }

  /**
   * Convert date range to API parameter
   */
  private convertDateRange(range: string): string | null {
    switch (range) {
      case 'last_week':
        return 'qdr:w'; // Google-style date filter
      case 'last_month':
        return 'qdr:m';
      case 'last_year':
        return 'qdr:y';
      default:
        return null;
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
