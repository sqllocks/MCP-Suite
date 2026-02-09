import type { RateLimitState } from '../types/index.js';

/**
 * Simple sliding window rate limiter
 */
export class RateLimiter {
  private state: RateLimitState;
  private windowMs: number;

  constructor(limit: number, windowMs: number = 60000) {
    this.state = {
      requests: [],
      limit,
    };
    this.windowMs = windowMs;
  }

  /**
   * Check if request can proceed and record it
   */
  async checkLimit(): Promise<{ allowed: boolean; retryAfter?: number }> {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Remove old requests outside the window
    this.state.requests = this.state.requests.filter((timestamp) => timestamp > windowStart);

    // Check if limit exceeded
    if (this.state.requests.length >= this.state.limit) {
      const oldestRequest = this.state.requests[0];
      const retryAfter = Math.ceil((oldestRequest + this.windowMs - now) / 1000);
      
      return {
        allowed: false,
        retryAfter,
      };
    }

    // Record this request
    this.state.requests.push(now);

    return { allowed: true };
  }

  /**
   * Get current rate limit statistics
   */
  getStats() {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    const recentRequests = this.state.requests.filter((timestamp) => timestamp > windowStart);

    return {
      limit: this.state.limit,
      remaining: Math.max(0, this.state.limit - recentRequests.length),
      used: recentRequests.length,
      resetAt: recentRequests.length > 0 
        ? new Date(recentRequests[0] + this.windowMs)
        : new Date(now + this.windowMs),
    };
  }

  /**
   * Reset rate limiter state
   */
  reset(): void {
    this.state.requests = [];
  }
}

/**
 * Execute function with rate limiting and retry logic
 */
export async function withRateLimit<T>(
  rateLimiter: RateLimiter,
  fn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let retries = 0;

  while (retries < maxRetries) {
    const { allowed, retryAfter } = await rateLimiter.checkLimit();

    if (allowed) {
      return await fn();
    }

    // Wait and retry
    retries++;
    if (retries < maxRetries && retryAfter) {
      await sleep(retryAfter * 1000);
    } else {
      throw new Error(`Rate limit exceeded. Retry after ${retryAfter} seconds.`);
    }
  }

  throw new Error('Max retries exceeded');
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
