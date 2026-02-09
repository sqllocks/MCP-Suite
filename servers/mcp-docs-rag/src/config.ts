import { z } from 'zod';

/**
 * Documentation source configuration
 */
export const DocSourceSchema = z.object({
  name: z.string(),
  base_url: z.string().url(),
  sitemap_url: z.string().url().optional(),
  max_depth: z.number().int().min(1).max(5).default(3),
  include_patterns: z.array(z.string()).default([]),
  exclude_patterns: z.array(z.string()).default([]),
});

export type DocSource = z.infer<typeof DocSourceSchema>;

/**
 * Main server configuration
 */
export const ConfigSchema = z.object({
  client_id: z.string(),
  platform: z.enum(['fabric', 'databricks', 'snowflake', 'azure', 'aws', 'gcp', 'custom']),
  
  // Index storage
  index_path: z.string(),
  
  // Documentation sets to index
  doc_sets: z.array(z.string()).default([]),
  
  // Embedding configuration
  embedding_provider: z.enum(['openai', 'local']).default('openai'),
  embedding_model: z.string().default('text-embedding-ada-002'),
  openai_api_key: z.string().optional(),
  
  // Chunking configuration
  chunk_size: z.number().int().min(100).max(5000).default(1000),
  chunk_overlap: z.number().int().min(0).max(500).default(200),
  
  // Search configuration
  top_k: z.number().int().min(1).max(50).default(5),
  similarity_threshold: z.number().min(0).max(1).default(0.7),
  
  // Indexing configuration
  max_concurrent_requests: z.number().int().min(1).max(10).default(3),
  request_delay_ms: z.number().int().min(0).default(1000),
  update_schedule: z.enum(['daily', 'weekly', 'monthly', 'manual']).default('weekly'),
});

export type Config = z.infer<typeof ConfigSchema>;

/**
 * Platform documentation sources
 */
export const PLATFORM_DOC_SOURCES: Record<string, DocSource[]> = {
  fabric: [
    {
      name: 'Microsoft Fabric',
      base_url: 'https://learn.microsoft.com/fabric/',
      sitemap_url: 'https://learn.microsoft.com/fabric/sitemap.xml',
      include_patterns: ['/fabric/'],
      exclude_patterns: [],
    },
    {
      name: 'Power BI',
      base_url: 'https://learn.microsoft.com/power-bi/',
      sitemap_url: 'https://learn.microsoft.com/power-bi/sitemap.xml',
      include_patterns: ['/power-bi/'],
      exclude_patterns: [],
    },
    {
      name: 'DAX Guide',
      base_url: 'https://dax.guide/',
      include_patterns: ['dax.guide'],
      exclude_patterns: [],
    },
  ],
  databricks: [
    {
      name: 'Databricks',
      base_url: 'https://docs.databricks.com/',
      sitemap_url: 'https://docs.databricks.com/sitemap.xml',
      include_patterns: ['docs.databricks.com'],
      exclude_patterns: [],
    },
    {
      name: 'Delta Lake',
      base_url: 'https://docs.delta.io/',
      include_patterns: ['docs.delta.io'],
      exclude_patterns: [],
    },
  ],
  snowflake: [
    {
      name: 'Snowflake',
      base_url: 'https://docs.snowflake.com/',
      sitemap_url: 'https://docs.snowflake.com/sitemap.xml',
      include_patterns: ['docs.snowflake.com'],
      exclude_patterns: [],
    },
  ],
  azure: [
    {
      name: 'Azure',
      base_url: 'https://learn.microsoft.com/azure/',
      sitemap_url: 'https://learn.microsoft.com/azure/sitemap.xml',
      include_patterns: ['/azure/'],
      exclude_patterns: [],
    },
  ],
  aws: [
    {
      name: 'AWS',
      base_url: 'https://docs.aws.amazon.com/',
      include_patterns: ['docs.aws.amazon.com'],
      exclude_patterns: [],
    },
  ],
  gcp: [
    {
      name: 'Google Cloud',
      base_url: 'https://cloud.google.com/docs/',
      include_patterns: ['cloud.google.com/docs'],
      exclude_patterns: [],
    },
  ],
};

/**
 * Get documentation sources for platform
 */
export function getDocSourcesForPlatform(platform: string): DocSource[] {
  return PLATFORM_DOC_SOURCES[platform.toLowerCase()] || [];
}

/**
 * Documentation chunk
 */
export interface DocChunk {
  id: string;
  content: string;
  embedding?: number[];
  metadata: {
    source: string;
    url: string;
    title: string;
    section?: string;
    doc_set: string;
    chunk_index: number;
    last_updated?: string;
  };
}

/**
 * Search result
 */
export interface SearchResult {
  content: string;
  source: string;
  title: string;
  score: number;
  metadata: {
    section?: string;
    lastUpdated?: string;
    url: string;
  };
}
