import { describe, expect, it, vi } from "vitest";
import { checkRateLimit, type MinimalLimiter } from "@/lib/api/rate-limit";

function makeRequest(ip?: string): Request {
  return new Request("http://localhost/api/v1/username-link?username=test", {
    headers: ip ? { "x-forwarded-for": ip } : {},
  });
}

const allowLimiter: MinimalLimiter = {
  limit: async () => ({ success: true, limit: 60, remaining: 59, reset: Date.now() + 60_000 }),
};

const denyLimiter: MinimalLimiter = {
  limit: async () => ({ success: false, limit: 60, remaining: 0, reset: Date.now() + 30_000 }),
};

describe("checkRateLimit", () => {
  it("allows and returns rate headers when under the limit", async () => {
    const result = await checkRateLimit(makeRequest("1.2.3.4"), "json", allowLimiter);
    expect(result.allowed).toBe(true);
    expect(result.headers["X-RateLimit-Limit"]).toBe("60");
    expect(result.headers["X-RateLimit-Remaining"]).toBe("59");
    expect(result.headers["X-RateLimit-Reset"]).toBeDefined();
  });

  it("denies with Retry-After when over the limit", async () => {
    const result = await checkRateLimit(makeRequest("1.2.3.4"), "json", denyLimiter);
    expect(result.allowed).toBe(false);
    expect(Number(result.headers["Retry-After"])).toBeGreaterThanOrEqual(1);
  });

  it("uses the first hop of x-forwarded-for as the key", async () => {
    const spy = vi.fn(allowLimiter.limit);
    await checkRateLimit(makeRequest("9.8.7.6, 10.0.0.1"), "json", { limit: spy });
    expect(spy).toHaveBeenCalledWith("9.8.7.6");
  });

  it("fails open when the limiter throws", async () => {
    const result = await checkRateLimit(makeRequest("1.2.3.4"), "json", {
      limit: async () => {
        throw new Error("redis down");
      },
    });
    expect(result.allowed).toBe(true);
    expect(result.headers).toEqual({});
  });

  it("fails open when the limiter exceeds the 250ms budget", async () => {
    const result = await checkRateLimit(makeRequest("1.2.3.4"), "json", {
      limit: () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ success: false, limit: 60, remaining: 0, reset: 0 }), 400),
        ),
    });
    expect(result.allowed).toBe(true);
  }, 1000);

  it("fails open when Upstash env vars are absent (no limiter available)", async () => {
    // No override passed; UPSTASH_REDIS_REST_URL is not set in the test env.
    const result = await checkRateLimit(makeRequest("1.2.3.4"), "json");
    expect(result.allowed).toBe(true);
  });
});
