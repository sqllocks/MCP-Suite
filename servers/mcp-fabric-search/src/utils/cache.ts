import { LRUCache } from 'lru-cache';
import type { CacheEntry } from '../types/index.js';

/**
 * Simple LRU cache with TTL support
 */
export class Cache<T> {
  private cache: LRUCache<string, CacheEntry<T>>;

  constructor(options: { max: number; ttl: number }) {
    this.cache = new LRUCache<string, CacheEntry<T>>({
      max: options.max,
      ttl: options.ttl * 1000, // Convert to milliseconds
    });
  }

  /**
   * Get value from cache
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if entry is expired
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl * 1000) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Set value in cache
   */
  set(key: string, value: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      data: value,
      timestamp: Date.now(),
      ttl: ttl ?? 3600, // Default 1 hour
    };

    this.cache.set(key, entry);
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Delete key from cache
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      max: this.cache.max,
    };
  }
}

/**
 * Create a cache key from multiple parameters
 */
export function createCacheKey(...parts: (string | number | boolean | undefined)[]): string {
  return parts
    .filter((part) => part !== undefined)
    .map((part) => String(part))
    .join(':');
}
