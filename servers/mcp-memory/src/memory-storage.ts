import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import type { Config, MemoryEntry, MemoryType, SearchQuery, MemoryStats } from './config.js';

/**
 * Profile-aware memory storage
 * Each client/profile has completely isolated memory
 */
export class MemoryStorage {
  private config: Config;
  private memoryIndex: Map<string, MemoryEntry> = new Map();
  private initialized = false;

  constructor(config: Config) {
    this.config = config;
  }

  /**
   * Initialize storage (load existing memories)
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Ensure storage directory exists (client-specific)
    await fs.mkdir(this.config.storage_path, { recursive: true });

    // Load existing memories
    await this.loadMemories();

    this.initialized = true;
  }

  /**
   * Store a new memory
   */
  async storeMemory(entry: Omit<MemoryEntry, 'id'>): Promise<MemoryEntry> {
    const id = this.generateId();
    
    const fullEntry: MemoryEntry = {
      id,
      ...entry,
    };

    // Add to index
    this.memoryIndex.set(id, fullEntry);

    // Persist to disk
    await this.saveMemory(fullEntry);

    // Cleanup old memories if needed
    await this.cleanup();

    return fullEntry;
  }

  /**
   * Search memories
   */
  async searchMemories(query: SearchQuery): Promise<MemoryEntry[]> {
    let results = Array.from(this.memoryIndex.values());

    // Filter by type
    if (query.types && query.types.length > 0) {
      results = results.filter(m => query.types!.includes(m.type));
    }

    // Filter by tags
    if (query.tags && query.tags.length > 0) {
      results = results.filter(m => 
        query.tags!.some(tag => m.metadata.tags.includes(tag))
      );
    }

    // Filter by importance
    if (query.minImportance !== undefined) {
      results = results.filter(m => m.metadata.importance >= query.minImportance!);
    }

    // Filter by date range
    if (query.dateFrom) {
      results = results.filter(m => m.metadata.timestamp >= query.dateFrom!);
    }
    if (query.dateTo) {
      results = results.filter(m => m.metadata.timestamp <= query.dateTo!);
    }

    // Text search (simple contains for now)
    if (query.query) {
      const searchLower = query.query.toLowerCase();
      results = results.filter(m => 
        m.content.toLowerCase().includes(searchLower) ||
        m.metadata.tags.some(tag => tag.toLowerCase().includes(searchLower)) ||
        (m.metadata.context && m.metadata.context.toLowerCase().includes(searchLower))
      );
    }

    // Sort by importance and recency
    results.sort((a, b) => {
      const importanceDiff = b.metadata.importance - a.metadata.importance;
      if (importanceDiff !== 0) return importanceDiff;
      return b.metadata.timestamp.localeCompare(a.metadata.timestamp);
    });

    // Limit results
    const limit = query.limit || 10;
    results = results.slice(0, limit);

    // Include related memories if configured
    if (this.config.include_related) {
      results = await this.expandWithRelated(results);
    }

    return results;
  }

  /**
   * Get memory by ID
   */
  async getMemory(id: string): Promise<MemoryEntry | null> {
    return this.memoryIndex.get(id) || null;
  }

  /**
   * Update memory
   */
  async updateMemory(id: string, updates: Partial<MemoryEntry>): Promise<MemoryEntry | null> {
    const existing = this.memoryIndex.get(id);
    if (!existing) return null;

    const updated: MemoryEntry = {
      ...existing,
      ...updates,
      id, // Never change ID
      metadata: {
        ...existing.metadata,
        ...updates.metadata,
      },
    };

    this.memoryIndex.set(id, updated);
    await this.saveMemory(updated);

    return updated;
  }

  /**
   * Delete memory
   */
  async deleteMemory(id: string): Promise<boolean> {
    const existed = this.memoryIndex.delete(id);
    
    if (existed) {
      const filePath = this.getMemoryFilePath(id);
      try {
        await fs.unlink(filePath);
      } catch (error) {
        // File might not exist, that's ok
      }
    }

    return existed;
  }

  /**
   * Get statistics
   */
  async getStats(): Promise<MemoryStats> {
    const entries = Array.from(this.memoryIndex.values());
    
    const byType: Record<MemoryType, number> = {} as any;
    for (const type of Object.values(MemoryType)) {
      byType[type] = entries.filter(e => e.type === type).length;
    }

    const timestamps = entries.map(e => e.metadata.timestamp).sort();
    const importances = entries.map(e => e.metadata.importance);
    const avgImportance = importances.length > 0
      ? importances.reduce((a, b) => a + b, 0) / importances.length
      : 0;

    // Calculate storage size
    const storageSize = await this.calculateStorageSize();

    return {
      totalEntries: entries.length,
      byType,
      oldestEntry: timestamps[0] || 'N/A',
      newestEntry: timestamps[timestamps.length - 1] || 'N/A',
      averageImportance: Math.round(avgImportance * 10) / 10,
      storageSize,
    };
  }

  /**
   * Export memories
   */
  async exportMemories(): Promise<MemoryEntry[]> {
    return Array.from(this.memoryIndex.values());
  }

  /**
   * Import memories
   */
  async importMemories(entries: MemoryEntry[]): Promise<number> {
    let imported = 0;

    for (const entry of entries) {
      this.memoryIndex.set(entry.id, entry);
      await this.saveMemory(entry);
      imported++;
    }

    return imported;
  }

  /**
   * Clear all memories (dangerous!)
   */
  async clearAll(): Promise<number> {
    const count = this.memoryIndex.size;
    
    // Delete all files
    const files = await fs.readdir(this.config.storage_path);
    for (const file of files) {
      if (file.endsWith('.json')) {
        await fs.unlink(path.join(this.config.storage_path, file));
      }
    }

    this.memoryIndex.clear();
    return count;
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  private generateId(): string {
    return `mem_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  private getMemoryFilePath(id: string): string {
    return path.join(this.config.storage_path, `${id}.json`);
  }

  private async loadMemories(): Promise<void> {
    try {
      const files = await fs.readdir(this.config.storage_path);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const filePath = path.join(this.config.storage_path, file);
            const content = await fs.readFile(filePath, 'utf-8');
            const entry: MemoryEntry = JSON.parse(content);
            
            this.memoryIndex.set(entry.id, entry);
          } catch (error) {
            console.error(`Failed to load memory file: ${file}`, error);
          }
        }
      }
    } catch (error) {
      // Directory might not exist yet, that's ok
    }
  }

  private async saveMemory(entry: MemoryEntry): Promise<void> {
    const filePath = this.getMemoryFilePath(entry.id);
    await fs.writeFile(
      filePath,
      JSON.stringify(entry, null, 2),
      'utf-8'
    );
  }

  private async cleanup(): Promise<void> {
    const entries = Array.from(this.memoryIndex.values());

    // Check if over limit
    if (entries.length <= this.config.max_memory_entries) {
      return;
    }

    // Sort by importance and timestamp
    entries.sort((a, b) => {
      const importanceDiff = a.metadata.importance - b.metadata.importance;
      if (importanceDiff !== 0) return importanceDiff;
      return a.metadata.timestamp.localeCompare(b.metadata.timestamp);
    });

    // Remove oldest/least important entries
    const toRemove = entries.length - this.config.max_memory_entries;
    for (let i = 0; i < toRemove; i++) {
      await this.deleteMemory(entries[i].id);
    }
  }

  private async expandWithRelated(memories: MemoryEntry[]): Promise<MemoryEntry[]> {
    const expanded = new Set<string>();
    const result: MemoryEntry[] = [];

    for (const memory of memories) {
      if (!expanded.has(memory.id)) {
        result.push(memory);
        expanded.add(memory.id);
      }

      // Add related memories
      if (memory.metadata.relatedTo) {
        for (const relatedId of memory.metadata.relatedTo) {
          if (!expanded.has(relatedId)) {
            const related = await this.getMemory(relatedId);
            if (related) {
              result.push(related);
              expanded.add(relatedId);
            }
          }
        }
      }
    }

    return result;
  }

  private async calculateStorageSize(): Promise<string> {
    try {
      const files = await fs.readdir(this.config.storage_path);
      let totalSize = 0;

      for (const file of files) {
        if (file.endsWith('.json')) {
          const stats = await fs.stat(path.join(this.config.storage_path, file));
          totalSize += stats.size;
        }
      }

      // Format size
      if (totalSize < 1024) return `${totalSize} B`;
      if (totalSize < 1024 * 1024) return `${(totalSize / 1024).toFixed(2)} KB`;
      return `${(totalSize / (1024 * 1024)).toFixed(2)} MB`;
    } catch {
      return 'Unknown';
    }
  }
}
