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
// /advertise no longer requires login (lower friction for a business
// inquiry), so it needs the same kind of per-IP spam protection as the
// other unauthenticated forms above.
export const advertiseRateLimiter: RateLimiter = new InMemoryRateLimiter(5, 15 * 60 * 1000);
// Separate, slightly looser limit for the anonymous ad-image upload itself
// (a real advertiser may re-upload a couple of times while composing).
export const adUploadRateLimiter: RateLimiter = new InMemoryRateLimiter(10, 15 * 60 * 1000);
export const supportTicketRateLimiter: RateLimiter = new InMemoryRateLimiter(5, 15 * 60 * 1000);
// Rider registration is unauthenticated and accepts a file upload (higher
// abuse cost per attempt than plain signup), so it gets its own, longer window
// rather than sharing registrationRateLimiter's 5-per-15-minutes.
export const riderRegistrationRateLimiter: RateLimiter = new InMemoryRateLimiter(5, 60 * 60 * 1000);
