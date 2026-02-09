import fetch from 'node-fetch';
import { SearchBackend, SearchOptions, SearchResult } from './search-backend.js';
import type { Logger } from '@mcp-suite/shared';

interface SerpAPIResult {
  position?: number;
  title?: string;
  link?: string;
  snippet?: string;
  displayed_link?: string;
  date?: string;
}

interface SerpAPIResponse {
  organic_results?: SerpAPIResult[];
  error?: string;
}

export class SerpAPIBackend extends SearchBackend {
  constructor(
    private apiKey: string,
    private baseUrl: string = 'https://serpapi.com/search',
    private logger?: Logger
  ) {
    super();
  }

  getName(): string {
    return 'SerpAPI';
  }

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey;
  }

  async search(options: SearchOptions): Promise<SearchResult[]> {
    const { query, topK = 10, dateRange, domains, language } = options;

    // Build search query with domain preferences
    let searchQuery = query;
    if (domains && domains.length > 0) {
      const domainFilter = domains.map((d) => `site:${d}`).join(' OR ');
      searchQuery = `${query} (${domainFilter})`;
    }

    // Build query parameters
    const params = new URLSearchParams({
      q: searchQuery,
      api_key: this.apiKey,
      num: topK.toString(),
      engine: 'google',
    });

    // Add date range filter
    if (dateRange && dateRange !== 'any') {
      const dateFilters: Record<string, string> = {
        last_week: 'w',
        last_month: 'm',
        last_year: 'y',
      };
      params.append('tbs', `qdr:${dateFilters[dateRange]}`);
    }

    // Add language filter
    if (language) {
      params.append('hl', language);
    }

    const url = `${this.baseUrl}?${params.toString()}`;
    this.logger?.debug({ url }, 'Making SerpAPI request');

    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`SerpAPI returned ${response.status}: ${response.statusText}`);
      }

      const data = (await response.json()) as SerpAPIResponse;

      if (data.error) {
        throw new Error(`SerpAPI error: ${data.error}`);
      }

      if (!data.organic_results || data.organic_results.length === 0) {
        this.logger?.warn({ query }, 'No results from SerpAPI');
        return [];
      }

      const results: SearchResult[] = data.organic_results
        .filter((result) => result.link && result.title)
        .map((result, index) => {
          const url = new URL(result.link!);
          
          return {
            title: result.title!,
            url: result.link!,
            snippet: result.snippet || '',
            sourceDomain: url.hostname,
            publishedDate: result.date,
            relevanceScore: 1 - index * 0.05, // Simple scoring based on position
          };
        });

      this.logger?.info(
        { count: results.length, query },
        'SerpAPI search completed'
      );

      return results;
    } catch (error) {
      this.logger?.error({ error, query }, 'SerpAPI search failed');
      throw error;
    }
  }
}
