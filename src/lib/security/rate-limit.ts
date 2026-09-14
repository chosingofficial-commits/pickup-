import "server-only";

export interface RateLimiter {
  /** Returns true if the action is allowed, false if the caller is rate-limited. */
  consume(key: string): Promise<boolean>;
}

/**
 * In-memory sliding-window limiter. Fine for a single Node.js instance
 * (Hostinger Node.js Web App / VPS). For multi-instance deployments, swap
 * this implementation for a Redis/Upstash-backed limiter that satisfies the
 * same `RateLimiter` interface — no call sites need to change.
 */
class InMemoryRateLimiter implements RateLimiter {
  private hits = new Map<string, number[]>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  async consume(key: string): Promise<boolean> {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    const timestamps = (this.hits.get(key) ?? []).filter((t) => t > windowStart);
    if (timestamps.length >= this.limit) {
      this.hits.set(key, timestamps);
      return false;
    }
    timestamps.push(now);
    this.hits.set(key, timestamps);
    return true;
  }
}

export const loginRateLimiter: RateLimiter = new InMemoryRateLimiter(10, 5 * 60 * 1000);
export const registrationRateLimiter: RateLimiter = new InMemoryRateLimiter(5, 15 * 60 * 1000);
export const coverageRequestRateLimiter: RateLimiter = new InMemoryRateLimiter(5, 15 * 60 * 1000);
export const supportTicketRateLimiter: RateLimiter = new InMemoryRateLimiter(5, 15 * 60 * 1000);
