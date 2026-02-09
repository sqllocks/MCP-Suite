import { z } from 'zod';

/**
 * Configuration schema for mcp-git
 */
export const ConfigSchema = z.object({
  client_id: z.string(),
  repo_roots: z.array(z.string()),
  max_results: z.number().default(100),
  max_file_size_mb: z.number().default(10),
});

export type Config = z.infer<typeof ConfigSchema>;

/**
 * Git commit information
 */
export interface GitCommit {
  commit: string;
  message: string;
  author: string;
  date: string;
  files?: string[];
}

/**
 * File history entry
 */
export interface FileHistoryEntry {
  commit: string;
  date: string;
  author: string;
  message: string;
  diff: string;
}

/**
 * Similar code match
 */
export interface SimilarCodeMatch {
  file: string;
  commit: string;
  similarity: number;
  snippet?: string;
}

/**
 * Recent change
 */
export interface RecentChange {
  commit: string;
  message: string;
  files: string[];
  additions: number;
  deletions: number;
  date: string;
  author: string;
}

/**
 * Branch comparison
 */
export interface BranchComparison {
  ahead: number;
  behind: number;
  files_changed: number;
  commits: GitCommit[];
}
