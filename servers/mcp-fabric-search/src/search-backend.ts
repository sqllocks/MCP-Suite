/**
 * Search result from any backend
 */
export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  sourceDomain: string;
  publishedDate?: string;
  relevanceScore?: number;
}

/**
 * Search options
 */
export interface SearchOptions {
  query: string;
  topK?: number;
  dateRange?: 'last_week' | 'last_month' | 'last_year' | 'any';
  contentType?: 'documentation' | 'blog' | 'video' | 'forum' | 'any';
  domains?: string[];
  language?: string;
}

/**
 * Abstract search backend
 */
export abstract class SearchBackend {
  abstract search(options: SearchOptions): Promise<SearchResult[]>;
  abstract getName(): string;
  abstract isAvailable(): Promise<boolean>;
}

/**
 * Error thrown when all search backends fail
 */
export class SearchError extends Error {
  constructor(
    message: string,
    public readonly backends: string[],
    public readonly errors: Error[]
  ) {
    super(message);
    this.name = 'SearchError';
  }
}
