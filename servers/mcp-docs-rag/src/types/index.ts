import { z } from 'zod';

// ============================================================================
// Configuration Types
// ============================================================================

export const DocsRAGConfigSchema = z.object({
  client_id: z.string(),
  platform: z.enum(['fabric', 'databricks', 'snowflake', 'azure', 'multi']),
  index_path: z.string(),
  doc_sets: z.array(z.string()).default(['fabric']),
  embedding_model: z.string().default('text-embedding-ada-002'),
  openai_api_key: z.string().optional(),
  chunk_size: z.number().default(1000),
  chunk_overlap: z.number().default(200),
  top_k: z.number().default(5),
});

export type DocsRAGConfig = z.infer<typeof DocsRAGConfigSchema>;

// ============================================================================
// Tool Parameter Types
// ============================================================================

export const DocSearchParamsSchema = z.object({
  query: z.string().min(1),
  doc_set: z.string().optional(),
  top_k: z.number().min(1).max(20).optional(),
  include_sources: z.boolean().default(true),
});

export type DocSearchParams = z.infer<typeof DocSearchParamsSchema>;

export const DocGetSectionParamsSchema = z.object({
  url: z.string().url(),
  depth: z.number().min(1).max(5).default(2),
});

export type DocGetSectionParams = z.infer<typeof DocGetSectionParamsSchema>;

export const DocFindExamplesParamsSchema = z.object({
  pattern: z.string().min(1),
  language: z.enum(['sql', 'dax', 'python', 'scala', 'm']).optional(),
});

export type DocFindExamplesParams = z.infer<typeof DocFindExamplesParamsSchema>;

// ============================================================================
// Response Types
// ============================================================================

export interface DocSearchResult {
  content: string;
  source: string;
  title: string;
  score: number;
  metadata?: {
    section?: string;
    lastUpdated?: string;
  };
}

export interface DocSection {
  url: string;
  content: string;
  hierarchy: string[];
  relatedSections: string[];
}

export interface CodeExample {
  code: string;
  language: string;
  source: string;
  description: string;
}

// ============================================================================
// Internal Types
// ============================================================================

export interface DocumentChunk {
  content: string;
  metadata: {
    source: string;
    title: string;
    section?: string;
    chunk_id: number;
  };
  embedding?: number[];
}

export interface IndexMetadata {
  version: string;
  platform: string;
  doc_sets: string[];
  created_at: string;
  chunk_count: number;
}
