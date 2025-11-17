/**
 * Prompt Cache - Sprint 13
 *
 * Simple in-memory cache for LLM prompts and responses.
 * Reduces costs by avoiding redundant API calls for identical prompts.
 *
 * Features:
 * - TTL (time-to-live) support
 * - Size limits
 * - LRU eviction policy
 * - Cache statistics
 */

export interface CacheEntry<T> {
  value: T;
  timestamp: Date;
  hits: number;
  size: number; // Estimated size in bytes
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalEntries: number;
  totalSize: number;
  evictions: number;
}

/**
 * In-memory LRU cache with TTL support
 *
 * Usage:
 * ```typescript
 * const cache = new PromptCache<LLMResponse>({
 *   maxSize: 100 * 1024 * 1024, // 100MB
 *   ttl: 3600000, // 1 hour
 * });
 *
 * // Store
 * cache.set('prompt-key', response);
 *
 * // Retrieve
 * const cached = cache.get('prompt-key');
 * if (cached) {
 *   return cached; // Cache hit!
 * }
 * ```
 */
export class PromptCache<T> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private accessOrder: string[] = []; // For LRU tracking

  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
  };

  private readonly maxSize: number;
  private readonly ttl: number;
  private currentSize: number = 0;

  constructor(options: {
    /** Maximum cache size in bytes (default: 50MB) */
    maxSize?: number;
    /** Time-to-live in milliseconds (default: 1 hour) */
    ttl?: number;
  } = {}) {
    this.maxSize = options.maxSize || 50 * 1024 * 1024; // 50MB default
    this.ttl = options.ttl || 3600000; // 1 hour default
  }

  /**
   * Generate cache key from prompt and context
   */
  static generateKey(prompt: string, context?: Record<string, any>): string {
    const contextStr = context
      ? JSON.stringify(context, Object.keys(context).sort())
      : '';

    // Simple hash function (not cryptographic, just for caching)
    const str = `${prompt}|${contextStr}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return `cache_${hash.toString(36)}`;
  }

  /**
   * Estimate size of object in bytes
   */
  private estimateSize(value: T): number {
    const str = JSON.stringify(value);
    return new Blob([str]).size;
  }

  /**
   * Check if entry is expired
   */
  private isExpired(entry: CacheEntry<T>): boolean {
    const age = Date.now() - entry.timestamp.getTime();
    return age > this.ttl;
  }

  /**
   * Evict least recently used entries until size is acceptable
   */
  private evictIfNeeded(newEntrySize: number): void {
    while (
      this.currentSize + newEntrySize > this.maxSize &&
      this.accessOrder.length > 0
    ) {
      // Evict least recently used (first in accessOrder)
      const keyToEvict = this.accessOrder.shift()!;
      const entry = this.cache.get(keyToEvict);

      if (entry) {
        this.currentSize -= entry.size;
        this.cache.delete(keyToEvict);
        this.stats.evictions++;
      }
    }
  }

  /**
   * Update access order for LRU tracking
   */
  private updateAccessOrder(key: string): void {
    // Remove from current position
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }

    // Add to end (most recently used)
    this.accessOrder.push(key);
  }

  /**
   * Get cached value
   *
   * @param key Cache key
   * @returns Cached value or undefined if not found/expired
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return undefined;
    }

    // Check if expired
    if (this.isExpired(entry)) {
      this.delete(key);
      this.stats.misses++;
      return undefined;
    }

    // Update stats and access order
    entry.hits++;
    this.stats.hits++;
    this.updateAccessOrder(key);

    return entry.value;
  }

  /**
   * Set cached value
   *
   * @param key Cache key
   * @param value Value to cache
   */
  set(key: string, value: T): void {
    const size = this.estimateSize(value);

    // Evict if necessary
    this.evictIfNeeded(size);

    // Remove old entry if exists
    const oldEntry = this.cache.get(key);
    if (oldEntry) {
      this.currentSize -= oldEntry.size;
    }

    // Add new entry
    this.cache.set(key, {
      value,
      timestamp: new Date(),
      hits: 0,
      size,
    });

    this.currentSize += size;
    this.updateAccessOrder(key);
  }

  /**
   * Delete cached entry
   *
   * @param key Cache key
   * @returns True if entry was deleted
   */
  delete(key: string): boolean {
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    this.currentSize -= entry.size;
    this.cache.delete(key);

    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }

    return true;
  }

  /**
   * Check if key exists in cache
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    return entry !== undefined && !this.isExpired(entry);
  }

  /**
   * Clear all cached entries
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
    this.currentSize = 0;
    this.stats.evictions = 0;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? this.stats.hits / totalRequests : 0;

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate,
      totalEntries: this.cache.size,
      totalSize: this.currentSize,
      evictions: this.stats.evictions,
    };
  }

  /**
   * Clean up expired entries
   *
   * @returns Number of entries removed
   */
  cleanup(): number {
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.delete(key);
        removed++;
      }
    }

    return removed;
  }

  /**
   * Get all cache keys (for debugging)
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache size in MB
   */
  getSizeMB(): number {
    return this.currentSize / (1024 * 1024);
  }

  /**
   * Get cache utilization percentage
   */
  getUtilization(): number {
    return (this.currentSize / this.maxSize) * 100;
  }
}
