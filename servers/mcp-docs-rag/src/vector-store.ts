import fs from 'fs/promises';
import path from 'path';
import type { DocChunk, SearchResult } from './config.js';
import type { Logger } from '@mcp-suite/shared';

/**
 * Simple in-memory vector store using cosine similarity
 */
export class VectorStore {
  private chunks: Map<string, DocChunk> = new Map();
  private indexPath: string;

  constructor(indexPath: string, private logger?: Logger) {
    this.indexPath = indexPath;
  }

  /**
   * Add chunks to the store
   */
  async addChunks(chunks: DocChunk[]): Promise<void> {
    for (const chunk of chunks) {
      this.chunks.set(chunk.id, chunk);
    }
    
    this.logger?.info(
      { count: chunks.length, total: this.chunks.size },
      'Added chunks to vector store'
    );
  }

  /**
   * Search using cosine similarity
   */
  async search(
    queryEmbedding: number[],
    topK: number = 5,
    docSet?: string,
    threshold: number = 0.7
  ): Promise<SearchResult[]> {
    const results: Array<{ chunk: DocChunk; score: number }> = [];

    // Calculate similarity for each chunk
    for (const chunk of this.chunks.values()) {
      // Filter by doc_set if specified
      if (docSet && chunk.metadata.doc_set !== docSet) {
        continue;
      }

      if (!chunk.embedding) {
        continue;
      }

      const score = this.cosineSimilarity(queryEmbedding, chunk.embedding);
      
      if (score >= threshold) {
        results.push({ chunk, score });
      }
    }

    // Sort by score
    results.sort((a, b) => b.score - a.score);

    // Take top K
    const topResults = results.slice(0, topK);

    this.logger?.debug(
      { count: topResults.length, topK },
      'Search completed'
    );

    // Convert to SearchResult format
    return topResults.map((r) => ({
      content: r.chunk.content,
      source: r.chunk.metadata.source,
      title: r.chunk.metadata.title,
      score: r.score,
      metadata: {
        section: r.chunk.metadata.section,
        lastUpdated: r.chunk.metadata.last_updated,
        url: r.chunk.metadata.url,
      },
    }));
  }

  /**
   * Get chunks by doc_set
   */
  getChunksByDocSet(docSet: string): DocChunk[] {
    return Array.from(this.chunks.values()).filter(
      (chunk) => chunk.metadata.doc_set === docSet
    );
  }

  /**
   * Get all doc_sets
   */
  getDocSets(): string[] {
    const docSets = new Set<string>();
    for (const chunk of this.chunks.values()) {
      docSets.add(chunk.metadata.doc_set);
    }
    return Array.from(docSets);
  }

  /**
   * Get statistics
   */
  getStats(): any {
    const docSets = this.getDocSets();
    const stats: any = {
      total_chunks: this.chunks.size,
      doc_sets: {},
    };

    for (const docSet of docSets) {
      const chunks = this.getChunksByDocSet(docSet);
      stats.doc_sets[docSet] = chunks.length;
    }

    return stats;
  }

  /**
   * Save index to disk
   */
  async save(): Promise<void> {
    try {
      await fs.mkdir(path.dirname(this.indexPath), { recursive: true });
      
      const data = {
        version: '1.0',
        chunks: Array.from(this.chunks.values()),
        created: new Date().toISOString(),
      };

      await fs.writeFile(
        this.indexPath,
        JSON.stringify(data, null, 2),
        'utf-8'
      );

      this.logger?.info({ path: this.indexPath }, 'Index saved');
    } catch (error) {
      this.logger?.error({ error }, 'Failed to save index');
      throw error;
    }
  }

  /**
   * Load index from disk
   */
  async load(): Promise<void> {
    try {
      const data = await fs.readFile(this.indexPath, 'utf-8');
      const parsed = JSON.parse(data);

      this.chunks.clear();
      for (const chunk of parsed.chunks) {
        this.chunks.set(chunk.id, chunk);
      }

      this.logger?.info(
        { count: this.chunks.size, path: this.indexPath },
        'Index loaded'
      );
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        this.logger?.warn('Index file not found, starting with empty index');
      } else {
        this.logger?.error({ error }, 'Failed to load index');
        throw error;
      }
    }
  }

  /**
   * Check if index exists
   */
  async exists(): Promise<boolean> {
    try {
      await fs.access(this.indexPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Clear all chunks
   */
  clear(): void {
    this.chunks.clear();
    this.logger?.info('Vector store cleared');
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }
}
