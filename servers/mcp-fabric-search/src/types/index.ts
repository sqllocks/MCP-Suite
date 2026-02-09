import { z } from 'zod';

// ============================================================================
// Configuration Types
// ============================================================================

export const PlatformSchema = z.enum(['fabric', 'databricks', 'snowflake', 'aws', 'azure', 'gcp', 'multi']);

export const SearchConfigSchema = z.object({
  client_id: z.string(),
  platform: PlatformSchema,
  search_api_base: z.string().url(),
  search_api_key: z.string(),
  preferred_domains: z.array(z.string()),
  strict_domains: z.boolean().default(false),
  max_results: z.number().min(1).max(50).default(5),
  cache_ttl: z.number().min(0).default(3600),
  rate_limit_per_minute: z.number().min(1).max(100).default(10),
  youtube_channels: z.array(z.string()).optional(),
  languages: z.array(z.string()).optional(),
});

export type Platform = z.infer<typeof PlatformSchema>;
export type SearchConfig = z.infer<typeof SearchConfigSchema>;

// ============================================================================
// Tool Parameter Types
// ============================================================================

export const WebSearchParamsSchema = z.object({
  query: z.string().min(1),
  top_k: z.number().min(1).max(50).optional(),
  date_range: z.enum(['last_week', 'last_month', 'last_year', 'all']).optional(),
  content_type: z.enum(['documentation', 'blog', 'video', 'forum', 'all']).optional(),
});

export type WebSearchParams = z.infer<typeof WebSearchParamsSchema>;

export const FetchPageParamsSchema = z.object({
  url: z.string().url(),
});

export type FetchPageParams = z.infer<typeof FetchPageParamsSchema>;

export const YouTubeSearchParamsSchema = z.object({
  query: z.string().min(1),
  channel_hint: z.string().optional(),
  max_results: z.number().min(1).max(20).optional(),
});

export type YouTubeSearchParams = z.infer<typeof YouTubeSearchParamsSchema>;

export const YouTubeTranscriptParamsSchema = z.object({
  url: z.string().url(),
  language: z.string().default('en'),
});

export type YouTubeTranscriptParams = z.infer<typeof YouTubeTranscriptParamsSchema>;

// ============================================================================
// Response Types
// ============================================================================

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  sourceDomain: string;
  publishedDate?: string;
  relevanceScore?: number;
}

export interface PageContent {
  url: string;
  content: string;
  metadata: {
    title?: string;
    author?: string;
    publishDate?: string;
    wordCount?: number;
  };
}

export interface YouTubeVideo {
  title: string;
  url: string;
  channel: string;
  description: string;
  duration?: string;
  publishedAt?: string;
}

export interface TranscriptSegment {
  timestamp: string;
  text: string;
}

export interface YouTubeTranscript {
  url: string;
  transcript: TranscriptSegment[];
}

// ============================================================================
// Internal Types
// ============================================================================

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface RateLimitState {
  requests: number[];
  limit: number;
}

export interface SearchBackendResponse {
  results: Array<{
    title: string;
    link: string;
    snippet: string;
    displayLink?: string;
    date?: string;
  }>;
}

// ============================================================================
// Platform Presets
// ============================================================================

export interface PlatformPreset {
  platform: Platform;
  preferred_domains: string[];
  youtube_channels?: string[];
  languages?: string[];
  query_enhancements: string[];
}

export const PLATFORM_PRESETS: Record<string, PlatformPreset> = {
  fabric: {
    platform: 'fabric',
    preferred_domains: [
      'learn.microsoft.com',
      'sqlbi.com',
      'guyinacube.com',
      'dax.guide',
      'tabulareditor.com',
      'powerbi.tips',
    ],
    youtube_channels: [
      'UC8butISFwT-Wl7EV0hUK0BQ', // Guy in a Cube
      'UCFp1vaKzpfvoGai7-MnVApw', // Microsoft Power BI
    ],
    languages: ['dax', 'm', 'sql', 'kql'],
    query_enhancements: ['Power BI', 'Fabric', 'semantic model'],
  },
  databricks: {
    platform: 'databricks',
    preferred_domains: [
      'docs.databricks.com',
      'databricks.com/blog',
      'community.databricks.com',
      'kb.databricks.com',
    ],
    youtube_channels: [
      'UC3q8O3Bh2Le8Rj1-Q-_UUbA', // Databricks
    ],
    languages: ['python', 'scala', 'sql'],
    query_enhancements: ['Databricks', 'Delta Lake', 'Spark'],
  },
  snowflake: {
    platform: 'snowflake',
    preferred_domains: [
      'docs.snowflake.com',
      'community.snowflake.com',
      'select.dev',
      'medium.com/snowflake',
    ],
    languages: ['sql', 'python', 'javascript'],
    query_enhancements: ['Snowflake', 'Snowpark'],
  },
};
