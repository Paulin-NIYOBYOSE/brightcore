import { describe, expect, it } from "vitest";
import { LoginRateLimiter } from "@/server/auth/rate-limit";

describe("LoginRateLimiter", () => {
  const WINDOW = 15 * 60 * 1000;

  it("blocks a key after five failures until the window ends", () => {
    const limiter = new LoginRateLimiter(5, WINDOW);
    const start = 1_000_000;

    for (let attempt = 0; attempt < 5; attempt++) {
      expect(limiter.retryAfterMs("ip|admin", start)).toBe(0);
      limiter.recordFailure("ip|admin", start);
    }

    expect(limiter.retryAfterMs("ip|admin", start + 1000)).toBe(WINDOW - 1000);
    expect(limiter.retryAfterMs("other-ip|admin", start + 1000)).toBe(0);
    expect(limiter.retryAfterMs("ip|admin", start + WINDOW)).toBe(0);
  });

  it("clears the count after a successful sign-in", () => {
    const limiter = new LoginRateLimiter(2, WINDOW);
    limiter.recordFailure("key", 0);
    limiter.recordFailure("key", 0);
    expect(limiter.retryAfterMs("key", 1)).toBeGreaterThan(0);
    limiter.reset("key");
    expect(limiter.retryAfterMs("key", 1)).toBe(0);
  });
});
