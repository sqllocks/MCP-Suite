import { z } from 'zod';

/**
 * Memory entry types
 */
export enum MemoryType {
  CONVERSATION = 'conversation',
  LEARNING = 'learning',
  PATTERN = 'pattern',
  DECISION = 'decision',
  SOLUTION = 'solution',
  PREFERENCE = 'preference',
  CONTEXT = 'context',
}

/**
 * Memory entry
 */
export interface MemoryEntry {
  id: string;
  type: MemoryType;
  content: string;
  metadata: {
    timestamp: string;
    tags: string[];
    importance: number; // 1-10
    context?: string;
    source?: string;
    relatedTo?: string[]; // IDs of related memories
  };
  embedding?: number[]; // For semantic search
}

/**
 * Memory storage configuration
 */
export const ConfigSchema = z.object({
  client_id: z.string(),
  profile_name: z.string().optional(),
  
  // Storage settings
  storage_path: z.string(), // Where to store memory files
  max_memory_entries: z.number().default(10000),
  retention_days: z.number().default(365), // How long to keep memories
  
  // Search settings
  enable_semantic_search: z.boolean().default(true),
  embedding_model: z.string().default('text-embedding-ada-002'),
  similarity_threshold: z.number().default(0.7),
  
  // Context settings
  max_context_window: z.number().default(5000), // Max tokens to return
  include_related: z.boolean().default(true), // Include related memories
  
  // Privacy settings
  encrypt_storage: z.boolean().default(false),
  encryption_key: z.string().optional(),
});

export type Config = z.infer<typeof ConfigSchema>;

/**
 * Search query
 */
export interface SearchQuery {
  query: string;
  types?: MemoryType[];
  tags?: string[];
  limit?: number;
  minImportance?: number;
  dateFrom?: string;
  dateTo?: string;
}

/**
 * Memory statistics
 */
export interface MemoryStats {
  totalEntries: number;
  byType: Record<MemoryType, number>;
  oldestEntry: string;
  newestEntry: string;
  averageImportance: number;
  storageSize: string;
}
