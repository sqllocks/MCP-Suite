import { z } from 'zod';

/**
 * Main server configuration
 */
export const ConfigSchema = z.object({
  client_id: z.string(),
  
  // GitHub configuration
  github_token: z.string().optional(),
  default_github_repos: z.array(z.string()).default([]),
  allowed_github_orgs: z.array(z.string()).default([]),
  
  // Local repository configuration
  client_repo_root: z.string(),
  allowed_file_extensions: z.array(z.string()).default([
    '.sql', '.dax', '.m', '.py', '.js', '.ts', '.yaml', '.yml',
    '.json', '.md', '.txt', '.sh', '.ps1', '.r', '.scala'
  ]),
  exclude_patterns: z.array(z.string()).default([
    '.git', 'node_modules', 'bin', 'obj', '.venv', '__pycache__',
    'dist', 'build', '.next', 'target', '.terraform'
  ]),
  
  // Limits
  max_code_results: z.number().int().min(1).max(100).default(10),
  max_file_size_mb: z.number().min(0.1).max(100).default(5),
  context_lines: z.number().int().min(0).max(20).default(3),
  
  // Search configuration
  case_sensitive: z.boolean().default(false),
  use_regex: z.boolean().default(false),
  include_binary: z.boolean().default(false),
});

export type Config = z.infer<typeof ConfigSchema>;

/**
 * Platform-specific repo recommendations
 */
export const PLATFORM_REPOS: Record<string, string[]> = {
  fabric: [
    'microsoft/fabric-samples',
    'microsoft/powerbi-samples',
    'Microsoft/Analysis-Services',
  ],
  databricks: [
    'databricks/databricks-ml-examples',
    'databricks/koalas',
    'delta-io/delta',
  ],
  snowflake: [
    'Snowflake-Labs/sfguide-getting-started-snowpark-python',
    'Snowflake-Labs/snowflake-demo-notebooks',
  ],
  azure: [
    'Azure/azure-quickstart-templates',
    'Azure-Samples/azure-samples',
  ],
};

/**
 * Language-specific file extensions
 */
export const LANGUAGE_EXTENSIONS: Record<string, string[]> = {
  dax: ['.dax'],
  m: ['.m', '.pq'],
  sql: ['.sql'],
  python: ['.py'],
  javascript: ['.js', '.mjs'],
  typescript: ['.ts', '.tsx'],
  scala: ['.scala'],
  r: ['.r', '.R'],
  powershell: ['.ps1', '.psm1'],
  bash: ['.sh', '.bash'],
  yaml: ['.yaml', '.yml'],
  json: ['.json'],
};

/**
 * Get recommended repos for platform
 */
export function getRecommendedRepos(platform: string): string[] {
  return PLATFORM_REPOS[platform.toLowerCase()] || [];
}

/**
 * Get extensions for language
 */
export function getExtensionsForLanguage(language: string): string[] {
  return LANGUAGE_EXTENSIONS[language.toLowerCase()] || [];
}
