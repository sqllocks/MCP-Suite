import { z } from 'zod';

/**
 * Platform-specific search configuration
 */
export const PlatformPresetSchema = z.object({
  platform: z.enum(['fabric', 'databricks', 'snowflake', 'azure', 'aws', 'gcp', 'custom']),
  preferred_domains: z.array(z.string()).default([]),
  youtube_channels: z.array(z.string()).default([]),
  languages: z.array(z.string()).default([]),
});

export type PlatformPreset = z.infer<typeof PlatformPresetSchema>;

/**
 * Main server configuration
 */
export const ConfigSchema = z.object({
  client_id: z.string(),
  platform: z.enum(['fabric', 'databricks', 'snowflake', 'azure', 'aws', 'gcp', 'custom']),
  
  // Search API configuration
  search_api_base: z.string().url().optional(),
  search_api_key: z.string().optional(),
  search_backend: z.enum(['serpapi', 'bing', 'google-cse']).default('serpapi'),
  
  // Domain preferences
  preferred_domains: z.array(z.string()).default([]),
  strict_domains: z.boolean().default(false),
  
  // YouTube configuration
  youtube_api_key: z.string().optional(),
  youtube_channels: z.array(z.string()).default([]),
  
  // Languages for code search
  languages: z.array(z.string()).default([]),
  
  // Limits and caching
  max_results: z.number().int().min(1).max(20).default(5),
  cache_ttl: z.number().int().min(60).default(3600), // seconds
  max_cache_size: z.number().int().min(10).default(100),
  
  // Rate limiting
  rate_limit_per_minute: z.number().int().min(1).default(10),
  
  // Retry configuration
  max_retries: z.number().int().min(0).default(3),
  retry_delay_ms: z.number().int().min(100).default(1000),
});

export type Config = z.infer<typeof ConfigSchema>;

/**
 * Platform presets with default configurations
 */
export const PLATFORM_PRESETS: Record<string, Partial<Config>> = {
  fabric: {
    platform: 'fabric',
    preferred_domains: [
      'learn.microsoft.com',
      'sqlbi.com',
      'guyinacube.com',
      'dax.guide',
      'tabulareditor.com',
      'powerbi.tips',
      'radacad.com',
    ],
    youtube_channels: [
      'UC8butISFwT-Wl7EV0hUK0BQ', // Guy in a Cube
      'UCFp1vaKzpfvoGai7-MnVApw', // SQLBI
    ],
    languages: ['dax', 'm', 'sql', 'kql', 'powerquery'],
  },
  databricks: {
    platform: 'databricks',
    preferred_domains: [
      'docs.databricks.com',
      'databricks.com/blog',
      'community.databricks.com',
      'kb.databricks.com',
      'docs.delta.io',
    ],
    youtube_channels: [
      'UC3q8O3Bh2Le8Rj1-Q-_UUbA', // Databricks
    ],
    languages: ['python', 'scala', 'sql', 'pyspark'],
  },
  snowflake: {
    platform: 'snowflake',
    preferred_domains: [
      'docs.snowflake.com',
      'community.snowflake.com',
      'select.dev',
      'medium.com/snowflake',
    ],
    youtube_channels: [
      'UC88lVAC05yzldyOXn_l_YjQ', // Snowflake
    ],
    languages: ['sql', 'python', 'javascript', 'snowpark'],
  },
  azure: {
    platform: 'azure',
    preferred_domains: [
      'learn.microsoft.com/azure',
      'docs.microsoft.com',
      'azure.microsoft.com/blog',
      'techcommunity.microsoft.com',
    ],
    languages: ['bicep', 'terraform', 'powershell', 'azure-cli', 'python'],
  },
  aws: {
    platform: 'aws',
    preferred_domains: [
      'docs.aws.amazon.com',
      'aws.amazon.com/blogs',
      'repost.aws',
    ],
    languages: ['cloudformation', 'terraform', 'python', 'typescript'],
  },
  gcp: {
    platform: 'gcp',
    preferred_domains: [
      'cloud.google.com/docs',
      'cloud.google.com/blog',
    ],
    languages: ['terraform', 'python', 'go'],
  },
};

/**
 * Merge platform preset with custom config
 */
export function mergeWithPreset(config: Partial<Config>): Config {
  const platform = config.platform || 'custom';
  const preset = PLATFORM_PRESETS[platform] || {};
  
  const merged = {
    ...preset,
    ...config,
    // Merge arrays instead of replacing
    preferred_domains: [
      ...(preset.preferred_domains || []),
      ...(config.preferred_domains || []),
    ],
    youtube_channels: [
      ...(preset.youtube_channels || []),
      ...(config.youtube_channels || []),
    ],
    languages: [
      ...(preset.languages || []),
      ...(config.languages || []),
    ],
  };
  
  return ConfigSchema.parse(merged);
}
