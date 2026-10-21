import "server-only";

const MAX_TRACKED_KEYS = 10_000;

/**
 * Counts failed sign-in attempts per key in a fixed time window. After
 * `maxFailures` failures the key is blocked until the window ends.
 *
 * Kept in memory, so limits are per server process and reset on restart. A
 * multi-instance deployment would move this to a shared store such as Redis.
 */
export class LoginRateLimiter {
  private readonly failures = new Map<string, { count: number; windowStart: number }>();

  constructor(
    private readonly maxFailures = 5,
    private readonly windowMs = 15 * 60 * 1000,
  ) {}

  /** Milliseconds until `key` may try again; 0 means it may try now. */
  retryAfterMs(key: string, now: number = Date.now()): number {
    const entry = this.failures.get(key);
    if (!entry) return 0;
    const elapsed = now - entry.windowStart;
    if (elapsed >= this.windowMs) {
      this.failures.delete(key);
      return 0;
    }
    return entry.count >= this.maxFailures ? this.windowMs - elapsed : 0;
  }

  recordFailure(key: string, now: number = Date.now()): void {
    const entry = this.failures.get(key);
    if (entry && now - entry.windowStart < this.windowMs) {
      entry.count += 1;
      return;
    }
    if (this.failures.size >= MAX_TRACKED_KEYS) this.pruneExpired(now);
    this.failures.set(key, { count: 1, windowStart: now });
  }

  reset(key: string): void {
    this.failures.delete(key);
  }

  private pruneExpired(now: number): void {
    for (const [key, entry] of this.failures) {
      if (now - entry.windowStart >= this.windowMs) this.failures.delete(key);
    }
  }
}

// Shared across hot reloads in development.
const globalForLimiter = globalThis as unknown as { loginRateLimiter?: LoginRateLimiter };
export const loginRateLimiter = (globalForLimiter.loginRateLimiter ??= new LoginRateLimiter());
