import { z } from 'zod';

// ============================================================================
// Configuration Types
// ============================================================================

export const CodeSearchConfigSchema = z.object({
  client_id: z.string(),
  github_token: z.string().optional(),
  default_github_repos: z.array(z.string()).default([]),
  client_repo_root: z.string(),
  max_code_results: z.number().min(1).max(100).default(10),
  allowed_file_extensions: z.array(z.string()).default([
    '.sql', '.dax', '.m', '.py', '.yaml', '.json', '.md', '.txt',
    '.js', '.ts', '.scala', '.java', '.cs', '.go', '.rb',
  ]),
  exclude_patterns: z.array(z.string()).default([
    '.git', 'node_modules', 'bin', 'obj', '.venv', '__pycache__',
    'dist', 'build', 'target', '.next', '.nuxt',
  ]),
  max_file_size_mb: z.number().min(0.1).max(100).default(5),
  context_lines: z.number().min(0).max(20).default(3),
});

export type CodeSearchConfig = z.infer<typeof CodeSearchConfigSchema>;

// ============================================================================
// Tool Parameter Types
// ============================================================================

export const GitHubCodeSearchParamsSchema = z.object({
  query: z.string().min(1),
  repo: z.string().optional(),
  language: z.enum(['sql', 'python', 'dax', 'm', 'yaml', 'javascript', 'typescript', 'scala', 'java']).optional(),
  path: z.string().optional(),
});

export type GitHubCodeSearchParams = z.infer<typeof GitHubCodeSearchParamsSchema>;

export const SearchRepoParamsSchema = z.object({
  query: z.string().min(1),
  file_glob: z.string().optional(),
  context_lines: z.number().min(0).max(20).optional(),
  max_results: z.number().min(1).max(100).optional(),
});

export type SearchRepoParams = z.infer<typeof SearchRepoParamsSchema>;

export const GetFileParamsSchema = z.object({
  path: z.string().min(1),
});

export type GetFileParams = z.infer<typeof GetFileParamsSchema>;

export const GetFileStructureParamsSchema = z.object({
  path: z.string().optional(),
  depth: z.number().min(1).max(10).optional(),
});

export type GetFileStructureParams = z.infer<typeof GetFileStructureParamsSchema>;

// ============================================================================
// Response Types
// ============================================================================

export interface GitHubCodeResult {
  repo: string;
  path: string;
  url: string;
  snippet: string;
  language?: string;
}

export interface LocalCodeResult {
  path: string;
  snippet: string;
  lineNumber: number;
  contextBefore: string[];
  contextAfter: string[];
}

export interface FileContent {
  path: string;
  content: string;
  metadata: {
    size: number;
    lastModified: string;
    language?: string;
    lines?: number;
  };
}

export interface FileStructure {
  tree: string;
  files: number;
  directories: number;
}

// ============================================================================
// Internal Types
// ============================================================================

export interface SearchMatch {
  file: string;
  line: number;
  content: string;
  contextBefore: string[];
  contextAfter: string[];
}

export interface FileStats {
  path: string;
  size: number;
  modified: Date;
  isDirectory: boolean;
}

// ============================================================================
// Language Detection
// ============================================================================

export const LANGUAGE_EXTENSIONS: Record<string, string[]> = {
  sql: ['.sql'],
  dax: ['.dax'],
  m: ['.m', '.pq'],
  python: ['.py', '.pyw'],
  javascript: ['.js', '.jsx', '.mjs'],
  typescript: ['.ts', '.tsx'],
  yaml: ['.yml', '.yaml'],
  json: ['.json', '.jsonc'],
  markdown: ['.md', '.markdown'],
  scala: ['.scala'],
  java: ['.java'],
  csharp: ['.cs'],
  go: ['.go'],
  ruby: ['.rb'],
  rust: ['.rs'],
  shell: ['.sh', '.bash'],
  powershell: ['.ps1', '.psm1'],
};

export function detectLanguage(filePath: string): string | undefined {
  const ext = filePath.substring(filePath.lastIndexOf('.')).toLowerCase();
  
  for (const [language, extensions] of Object.entries(LANGUAGE_EXTENSIONS)) {
    if (extensions.includes(ext)) {
      return language;
    }
  }
  
  return undefined;
}
