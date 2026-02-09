import OpenAI from 'openai';
import type { Logger } from '@mcp-suite/shared';

/**
 * Embedding service using OpenAI
 */
export class EmbeddingService {
  private openai: OpenAI;
  private model: string;

  constructor(apiKey: string, model: string, private logger?: Logger) {
    this.openai = new OpenAI({ apiKey });
    this.model = model;
  }

  /**
   * Generate embedding for a single text
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: this.model,
        input: text,
      });

      return response.data[0].embedding;
    } catch (error) {
      this.logger?.error({ error, text: text.substring(0, 100) }, 'Failed to generate embedding');
      throw error;
    }
  }

  /**
   * Generate embeddings for multiple texts in batches
   */
  async generateEmbeddings(
    texts: string[],
    batchSize: number = 100
  ): Promise<number[][]> {
    const embeddings: number[][] = [];

    // Process in batches
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      
      this.logger?.debug(
        { batch: i / batchSize + 1, total: Math.ceil(texts.length / batchSize) },
        'Generating embeddings batch'
      );

      try {
        const response = await this.openai.embeddings.create({
          model: this.model,
          input: batch,
        });

        embeddings.push(...response.data.map((d) => d.embedding));

        // Add delay to avoid rate limits
        if (i + batchSize < texts.length) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      } catch (error) {
        this.logger?.error({ error, batchIndex: i }, 'Failed to generate embeddings batch');
        throw error;
      }
    }

    return embeddings;
  }

  /**
   * Get embedding dimension
   */
  async getEmbeddingDimension(): Promise<number> {
    const testEmbedding = await this.generateEmbedding('test');
    return testEmbedding.length;
  }
}

/**
 * Mock embedding service for testing (uses random vectors)
 */
export class MockEmbeddingService {
  private dimension: number = 1536; // OpenAI ada-002 dimension

  async generateEmbedding(text: string): Promise<number[]> {
    // Generate deterministic random vector based on text hash
    const hash = this.hashString(text);
    const random = this.seededRandom(hash);
    
    const embedding: number[] = [];
    for (let i = 0; i < this.dimension; i++) {
      embedding.push(random() * 2 - 1); // Range [-1, 1]
    }

    // Normalize
    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map((val) => val / norm);
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map((text) => this.generateEmbedding(text)));
  }

  async getEmbeddingDimension(): Promise<number> {
    return this.dimension;
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  private seededRandom(seed: number): () => number {
    let state = seed;
    return () => {
      state = (state * 1664525 + 1013904223) % 4294967296;
      return state / 4294967296;
    };
  }
}
