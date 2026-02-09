/**
 * Text chunking utility
 */
export class TextChunker {
  constructor(
    private chunkSize: number,
    private chunkOverlap: number
  ) {
    if (chunkOverlap >= chunkSize) {
      throw new Error('Chunk overlap must be less than chunk size');
    }
  }

  /**
   * Split text into chunks with overlap
   */
  chunkText(text: string): string[] {
    // Split by sentences first (simple approach)
    const sentences = this.splitIntoSentences(text);
    const chunks: string[] = [];
    
    let currentChunk: string[] = [];
    let currentLength = 0;

    for (const sentence of sentences) {
      const sentenceLength = sentence.length;

      // If adding this sentence exceeds chunk size, start new chunk
      if (currentLength + sentenceLength > this.chunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk.join(' '));

        // Calculate overlap
        const overlapLength = this.calculateOverlap(currentChunk);
        currentChunk = currentChunk.slice(overlapLength);
        currentLength = currentChunk.join(' ').length;
      }

      currentChunk.push(sentence);
      currentLength += sentenceLength;
    }

    // Add remaining chunk
    if (currentChunk.length > 0) {
      chunks.push(currentChunk.join(' '));
    }

    return chunks.filter((chunk) => chunk.trim().length > 0);
  }

  /**
   * Split text into sentences
   */
  private splitIntoSentences(text: string): string[] {
    // Simple sentence splitting (can be enhanced with NLP)
    return text
      .split(/[.!?]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }

  /**
   * Calculate how many sentences to keep for overlap
   */
  private calculateOverlap(sentences: string[]): number {
    let overlapLength = 0;
    let sentenceCount = 0;

    // Count from the end backwards
    for (let i = sentences.length - 1; i >= 0; i--) {
      overlapLength += sentences[i].length;
      sentenceCount++;

      if (overlapLength >= this.chunkOverlap) {
        break;
      }
    }

    // Return number of sentences to skip (keep the rest)
    return Math.max(0, sentences.length - sentenceCount);
  }

  /**
   * Split text into chunks by character count (simpler alternative)
   */
  chunkByCharacters(text: string): string[] {
    const chunks: string[] = [];
    const stride = this.chunkSize - this.chunkOverlap;

    for (let i = 0; i < text.length; i += stride) {
      const chunk = text.slice(i, i + this.chunkSize);
      if (chunk.trim().length > 0) {
        chunks.push(chunk.trim());
      }
    }

    return chunks;
  }

  /**
   * Extract code blocks from markdown
   */
  extractCodeBlocks(markdown: string): Array<{ code: string; language: string }> {
    const codeBlocks: Array<{ code: string; language: string }> = [];
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    
    let match;
    while ((match = codeBlockRegex.exec(markdown)) !== null) {
      codeBlocks.push({
        language: match[1] || 'text',
        code: match[2].trim(),
      });
    }

    return codeBlocks;
  }

  /**
   * Remove code blocks from markdown (for text-only chunking)
   */
  removeCodeBlocks(markdown: string): string {
    return markdown.replace(/```[\s\S]*?```/g, '');
  }

  /**
   * Get chunk statistics
   */
  getStats(chunks: string[]): {
    count: number;
    avgLength: number;
    minLength: number;
    maxLength: number;
  } {
    if (chunks.length === 0) {
      return { count: 0, avgLength: 0, minLength: 0, maxLength: 0 };
    }

    const lengths = chunks.map((c) => c.length);
    
    return {
      count: chunks.length,
      avgLength: lengths.reduce((a, b) => a + b, 0) / lengths.length,
      minLength: Math.min(...lengths),
      maxLength: Math.max(...lengths),
    };
  }
}
