import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export type LimiterKind = "json" | "qr";

/** Structural subset of @upstash/ratelimit's Ratelimit — lets tests inject fakes. */
export interface MinimalLimiter {
  limit(key: string): Promise<{ success: boolean; limit: number; remaining: number; reset: number }>;
}

export interface RateLimitResult {
  allowed: boolean;
  headers: Record<string, string>;
}

const WINDOW = "60 s" as const;
const REQUESTS: Record<LimiterKind, number> = { json: 60, qr: 20 };
const TIMEOUT_MS = 250;

let limiters: Record<LimiterKind, Ratelimit> | null | undefined;

function getLimiter(kind: LimiterKind): MinimalLimiter | null {
  if (limiters === undefined) {
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      limiters = null;
    } else {
      const redis = Redis.fromEnv();
      limiters = {
        json: new Ratelimit({
          redis,
          limiter: Ratelimit.slidingWindow(REQUESTS.json, WINDOW),
          prefix: "api-rl:json",
        }),
        qr: new Ratelimit({
          redis,
          limiter: Ratelimit.slidingWindow(REQUESTS.qr, WINDOW),
          prefix: "api-rl:qr",
        }),
      };
    }
  }
  return limiters?.[kind] ?? null;
}

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

/**
 * Fail-open by design: if Redis is unreachable, slow (>250ms), or unconfigured,
 * the request proceeds. Availability over strictness — Vercel spend caps are
 * the backstop against sustained abuse.
 */
export async function checkRateLimit(
  request: Request,
  kind: LimiterKind,
  limiter: MinimalLimiter | null = getLimiter(kind),
): Promise<RateLimitResult> {
  if (!limiter) return { allowed: true, headers: {} };

  try {
    const result = await Promise.race([
      limiter.limit(clientIp(request)),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("rate-limit timeout")), TIMEOUT_MS),
      ),
    ]);

    const headers: Record<string, string> = {
      "X-RateLimit-Limit": String(result.limit),
      "X-RateLimit-Remaining": String(result.remaining),
      "X-RateLimit-Reset": String(result.reset),
    };

    if (!result.success) {
      headers["Retry-After"] = String(
        Math.max(1, Math.ceil((result.reset - Date.now()) / 1000)),
      );
    }

    return { allowed: result.success, headers };
  } catch (error) {
    console.warn("[api] rate-limit check failed, failing open:", error);
    return { allowed: true, headers: {} };
  }
}
