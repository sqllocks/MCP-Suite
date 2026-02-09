import { z } from 'zod';

/**
 * Main server configuration
 */
export const ConfigSchema = z.object({
  kb_root: z.string().default('./knowledge-base'),
  categories: z.array(z.string()).default([
    'patterns',
    'runbooks',
    'client-notes',
    'snippets',
    'lessons-learned',
  ]),
  max_results: z.number().default(20),
  enable_semantic_search: z.boolean().default(false),
});

export type Config = z.infer<typeof ConfigSchema>;

/**
 * Knowledge entry
 */
export interface KnowledgeEntry {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  client?: string;
  path: string;
  created: string;
  modified: string;
  metadata: Record<string, any>;
}

/**
 * Search result
 */
export interface SearchResult {
  entry: KnowledgeEntry;
  score: number;
  matchedFields: string[];
}

/**
 * Runbook structure
 */
export interface Runbook {
  title: string;
  description?: string;
  category: string;
  prerequisites: string[];
  steps: RunbookStep[];
  notes?: string;
  troubleshooting?: Array<{
    problem: string;
    solution: string;
  }>;
}

export interface RunbookStep {
  number: number;
  title: string;
  description: string;
  commands?: string[];
  warnings?: string[];
}

/**
 * Pattern structure
 */
export interface Pattern {
  name: string;
  category: string;
  description: string;
  problem: string;
  solution: string;
  examples?: Array<{
    title: string;
    code: string;
    language?: string;
  }>;
  relatedPatterns?: string[];
  tags: string[];
}
