# Public API v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a free, keyless, rate-limited public REST API (`/api/v1/*`) exposing link generation, validation, and QR generation, plus a trilingual `/developers` docs page.

**Architecture:** Thin Next.js Route Handlers in the existing project reuse `services/` and `utils/validate-*` untouched. Shared helpers in `lib/api/` handle CORS/cache/errors/rate-limiting. All endpoints are GET and deterministic → CDN-cacheable. Rate limiting via Upstash Redis (fail-open).

**Tech Stack:** Next.js 15 Route Handlers, `qrcode` (server-side QR), `@upstash/ratelimit` + `@upstash/redis`, vitest (node env), next-intl.

**Spec:** `docs/superpowers/specs/2026-07-04-public-api-design.md` — read it first.

**Conventions in force:**
- Tests are colocated next to source (`foo.ts` + `foo.test.ts`), vitest node env, run with `pnpm test`.
- Type-check with `npx tsc --noEmit` — if it errors about stale `app/page.js` in `.next/types`, run `rm -rf .next` first (known gotcha, not your bug).
- Commit after every task. Direct commits to the working branch, message style: conventional commits (`feat:`, `test:`, `docs:`).
- API JSON error/response messages are English-only. The `/developers` page is trilingual (en/pt/es) — every user-visible string goes through next-intl namespace `developers`.

---

### Task 1: Dependencies + Upstash environment

**Files:**
- Modify: `package.json` (via pnpm, not by hand)

- [ ] **Step 1: Install runtime deps**

```bash
cd /root/whatsuser-link
pnpm add qrcode @upstash/ratelimit @upstash/redis
pnpm add -D @types/qrcode
```

Expected: lockfile updated, no peer warnings that block install. Gotcha: if a later `pnpm` call complains about `pnpm-workspace.yaml` `ignored-builds` placeholder, set the offending field to a real boolean — known pnpm auto-mutation issue.

- [ ] **Step 2: Check whether Upstash env vars already exist on Vercel**

```bash
vercel env ls | grep -i upstash
```

If `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are listed: run `vercel env pull .env.local` and continue.

If NOT listed: **stop and report to the coordinator/user** — the Upstash integration must be installed from the Vercel dashboard (Marketplace → Upstash → free tier → link to project `whatsuser-link`). Do not attempt to create Upstash accounts yourself. Everything else in this plan still works without these vars (rate limiter fails open when they're absent), so implementation may proceed; only the final deploy task hard-requires them.

- [ ] **Step 3: Verify baseline still green**

```bash
pnpm test && npx tsc --noEmit && pnpm lint
```

Expected: all pass (26+ tests).

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add qrcode and upstash deps for public API"
```

---

### Task 2: Error-code mapping (`lib/api/error-codes.ts`)

Existing validators return i18n keys (`errors.length`, `keyErrors.invalidFormat`, …). The API needs stable snake_case codes + English messages.

**Files:**
- Create: `lib/api/error-codes.ts`
- Test: `lib/api/error-codes.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// lib/api/error-codes.test.ts
import { describe, expect, it } from "vitest";
import { mapValidationError, ALL_MAPPED_I18N_KEYS } from "@/lib/api/error-codes";

describe("mapValidationError", () => {
  it("maps every known validator i18n key to a stable code + message", () => {
    const expectedKeys = [
      "errors.length",
      "errors.invalidChars",
      "errors.noLetter",
      "errors.startsWithWww",
      "errors.reservedDomain",
      "keyErrors.invalidFormat",
      "phoneErrors.invalidFormat",
    ];
    expect(ALL_MAPPED_I18N_KEYS.sort()).toEqual(expectedKeys.sort());

    for (const key of expectedKeys) {
      const detail = mapValidationError(key);
      expect(detail.code).toMatch(/^[a-z_]+$/);
      expect(detail.message.length).toBeGreaterThan(10);
    }
  });

  it("maps specific keys to specific codes", () => {
    expect(mapValidationError("errors.length").code).toBe("username_length");
    expect(mapValidationError("keyErrors.invalidFormat").code).toBe("key_invalid_format");
    expect(mapValidationError("phoneErrors.invalidFormat").code).toBe("phone_invalid_format");
  });

  it("falls back to invalid_input for unknown keys", () => {
    expect(mapValidationError("errors.somethingNew")).toEqual({
      code: "invalid_input",
      message: "Invalid input.",
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- lib/api/error-codes.test.ts`
Expected: FAIL — cannot resolve `@/lib/api/error-codes`.

- [ ] **Step 3: Write the implementation**

```typescript
// lib/api/error-codes.ts

/**
 * The UI validators return next-intl message keys. The public API must never
 * leak those (they're an internal concern and not stable); this table maps
 * each key to a frozen, documented API error code. v1 codes must never change.
 */
export interface ApiErrorDetail {
  code: string;
  message: string;
}

const ERROR_MAP: Record<string, ApiErrorDetail> = {
  "errors.length": {
    code: "username_length",
    message: "Username must be 3-35 characters.",
  },
  "errors.invalidChars": {
    code: "username_invalid_chars",
    message: "Username may only contain lowercase letters, numbers, dots, and underscores.",
  },
  "errors.noLetter": {
    code: "username_no_letter",
    message: "Username must contain at least one letter.",
  },
  "errors.startsWithWww": {
    code: "username_starts_with_www",
    message: 'Username cannot start with "www.".',
  },
  "errors.reservedDomain": {
    code: "username_reserved_suffix",
    message: "Username cannot end with a reserved domain or file extension.",
  },
  "keyErrors.invalidFormat": {
    code: "key_invalid_format",
    message: "Key must be 4-8 letters or numbers.",
  },
  "phoneErrors.invalidFormat": {
    code: "phone_invalid_format",
    message: "Phone must be 8-15 digits including country code (digits only, no spaces or symbols).",
  },
};

export const ALL_MAPPED_I18N_KEYS = Object.keys(ERROR_MAP);

export function mapValidationError(i18nKey: string): ApiErrorDetail {
  return ERROR_MAP[i18nKey] ?? { code: "invalid_input", message: "Invalid input." };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- lib/api/error-codes.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/api/error-codes.ts lib/api/error-codes.test.ts
git commit -m "feat: map validator i18n keys to stable API error codes"
```

---

### Task 3: Response helpers (`lib/api/responses.ts`)

**Files:**
- Create: `lib/api/responses.ts`
- Test: `lib/api/responses.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// lib/api/responses.test.ts
import { describe, expect, it } from "vitest";
import {
  apiJson,
  apiError,
  apiOptions,
  apiRateLimited,
  API_SUCCESS_CACHE_CONTROL,
  USERNAME_LINK_NOTICE,
} from "@/lib/api/responses";

describe("apiJson", () => {
  it("returns 200 with CORS, cache headers, and the payload", async () => {
    const res = apiJson({ hello: "world" });
    expect(res.status).toBe(200);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(res.headers.get("Cache-Control")).toBe(API_SUCCESS_CACHE_CONTROL);
    expect(await res.json()).toEqual({ hello: "world" });
  });

  it("merges extra headers", () => {
    const res = apiJson({}, { "X-RateLimit-Remaining": "59" });
    expect(res.headers.get("X-RateLimit-Remaining")).toBe("59");
  });
});

describe("apiError", () => {
  it("returns the spec error envelope with no-store cache", async () => {
    const res = apiError(400, "invalid_username", "Bad username.");
    expect(res.status).toBe(400);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(await res.json()).toEqual({
      error: { code: "invalid_username", message: "Bad username." },
    });
  });
});

describe("apiOptions", () => {
  it("returns 204 with CORS method headers", () => {
    const res = apiOptions();
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Methods")).toContain("GET");
  });
});

describe("apiRateLimited", () => {
  it("returns 429 with rate_limited code and passes through headers", async () => {
    const res = apiRateLimited({ "Retry-After": "30" });
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("30");
    const body = await res.json();
    expect(body.error.code).toBe("rate_limited");
  });
});

describe("USERNAME_LINK_NOTICE", () => {
  it("is dated and points at llms.txt", () => {
    expect(USERNAME_LINK_NOTICE).toMatch(/\d{4}-\d{2}-\d{2}/);
    expect(USERNAME_LINK_NOTICE).toContain("llms.txt");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- lib/api/responses.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```typescript
// lib/api/responses.ts
import { siteConfig } from "@/config/site";

export const API_CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

/** All 200s are deterministic functions of their query params — let the CDN keep them. */
export const API_SUCCESS_CACHE_CONTROL =
  "public, s-maxage=86400, stale-while-revalidate=604800";

/**
 * Status of wa.me username links, surfaced in API responses so integrators
 * aren't surprised. MUST be updated in the same pass as app/llms.txt/route.ts
 * when the rollout status changes — grep "2026-07" to find both.
 */
export const USERNAME_LINK_NOTICE =
  "As of 2026-07-04, wa.me/<username> links do not yet open a chat for most " +
  "accounts (WhatsApp's username rollout is phased and regional). Verify before " +
  `relying on them. Current status: ${siteConfig.url}/llms.txt`;

export function apiJson(data: unknown, extraHeaders: Record<string, string> = {}): Response {
  return Response.json(data, {
    headers: {
      ...API_CORS_HEADERS,
      "Cache-Control": API_SUCCESS_CACHE_CONTROL,
      ...extraHeaders,
    },
  });
}

export function apiError(
  status: number,
  code: string,
  message: string,
  extraHeaders: Record<string, string> = {},
): Response {
  return Response.json(
    { error: { code, message } },
    {
      status,
      headers: { ...API_CORS_HEADERS, "Cache-Control": "no-store", ...extraHeaders },
    },
  );
}

export function apiRateLimited(extraHeaders: Record<string, string> = {}): Response {
  return apiError(429, "rate_limited", "Too many requests, slow down.", extraHeaders);
}

export function apiOptions(): Response {
  return new Response(null, { status: 204, headers: API_CORS_HEADERS });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- lib/api/responses.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/api/responses.ts lib/api/responses.test.ts
git commit -m "feat: add shared API response helpers (CORS, cache, error envelope)"
```

---

### Task 4: Rate limiting (`lib/api/rate-limit.ts`)

Sliding window per IP via Upstash. **Fail-open** on missing env vars, errors, or >250 ms latency. Limiter is injectable so tests never touch the network.

**Files:**
- Create: `lib/api/rate-limit.ts`
- Test: `lib/api/rate-limit.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// lib/api/rate-limit.test.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- lib/api/rate-limit.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```typescript
// lib/api/rate-limit.ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- lib/api/rate-limit.test.ts`
Expected: PASS (6 tests). Note the timeout test takes ~250ms — normal.

- [ ] **Step 5: Commit**

```bash
git add lib/api/rate-limit.ts lib/api/rate-limit.test.ts
git commit -m "feat: add fail-open per-IP rate limiting via Upstash"
```

---

### Task 5: Short-link helper (`lib/short-link.ts`) + DRY refactor

`components/whatsapp/link-result.tsx:19` builds the short link inline. The API needs the same logic — extract it.

**Files:**
- Create: `lib/short-link.ts`
- Test: `lib/short-link.test.ts`
- Modify: `components/whatsapp/link-result.tsx:19`

- [ ] **Step 1: Write the failing test**

```typescript
// lib/short-link.test.ts
import { describe, expect, it } from "vitest";
import { buildShortLink } from "@/lib/short-link";
import { siteConfig } from "@/config/site";

describe("buildShortLink", () => {
  it("appends the username to the site URL", () => {
    expect(buildShortLink("joao.silva")).toBe(`${siteConfig.url}/joao.silva`);
  });

  it("never produces a double slash even if siteConfig.url has a trailing slash", () => {
    expect(buildShortLink("ana")).not.toContain("//ana");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- lib/short-link.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```typescript
// lib/short-link.ts
import { siteConfig } from "@/config/site";

export function buildShortLink(username: string): string {
  return `${siteConfig.url.replace(/\/+$/, "")}/${username}`;
}
```

- [ ] **Step 4: Refactor the component to use it**

In `components/whatsapp/link-result.tsx`, replace:

```typescript
const shortUrl = `${siteConfig.url.replace(/\/+$/, "")}/${link.username}`;
```

with:

```typescript
const shortUrl = buildShortLink(link.username);
```

Add `import { buildShortLink } from "@/lib/short-link";` and remove the `siteConfig` import **only if** nothing else in the file uses it (check first).

- [ ] **Step 5: Run full test suite + typecheck**

Run: `pnpm test && npx tsc --noEmit`
Expected: all PASS, no type errors.

- [ ] **Step 6: Commit**

```bash
git add lib/short-link.ts lib/short-link.test.ts components/whatsapp/link-result.tsx
git commit -m "refactor: extract buildShortLink helper for reuse by public API"
```

---

### Task 6: Server-side QR generation (`lib/qr/generate-qr.ts`)

The site's QR is client-side (`qrcode.react`) — cannot be reused server-side. New module using the `qrcode` npm package.

**Files:**
- Create: `lib/qr/generate-qr.ts`
- Test: `lib/qr/generate-qr.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// lib/qr/generate-qr.test.ts
import { describe, expect, it } from "vitest";
import { generateQr } from "@/lib/qr/generate-qr";

const BASE = {
  content: "https://wa.me/joao.silva",
  size: 256,
  color: "#000000",
  background: "#ffffff",
};

describe("generateQr", () => {
  it("produces an SVG string containing the svg root element", async () => {
    const out = await generateQr({ ...BASE, format: "svg" });
    expect(out.contentType).toBe("image/svg+xml");
    expect(typeof out.body).toBe("string");
    expect(out.body).toContain("<svg");
  });

  it("produces a PNG with the correct magic bytes at the requested size", async () => {
    const out = await generateQr({ ...BASE, format: "png" });
    expect(out.contentType).toBe("image/png");
    const bytes = out.body as Uint8Array;
    expect(bytes[0]).toBe(0x89);
    expect(bytes[1]).toBe(0x50); // 'P'
    expect(bytes.length).toBeGreaterThan(100);
  });

  it("accepts an RGBA background for transparency without throwing", async () => {
    const out = await generateQr({ ...BASE, format: "png", background: "#ffffff00" });
    expect(out.contentType).toBe("image/png");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- lib/qr/generate-qr.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```typescript
// lib/qr/generate-qr.ts
import QRCode from "qrcode";

export interface QrOptions {
  content: string;
  format: "png" | "svg";
  /** Pixel width — PNG only; SVG is inherently scalable. */
  size: number;
  /** Foreground, "#RRGGBB" or "#RRGGBBAA". */
  color: string;
  /** Background, "#RRGGBB" or "#RRGGBBAA" (use alpha 00 for transparent). */
  background: string;
}

export interface QrOutput {
  body: string | Uint8Array;
  contentType: "image/svg+xml" | "image/png";
}

export async function generateQr(options: QrOptions): Promise<QrOutput> {
  const colorConfig = { dark: options.color, light: options.background };

  if (options.format === "svg") {
    const svg = await QRCode.toString(options.content, {
      type: "svg",
      margin: 2,
      color: colorConfig,
    });
    return { body: svg, contentType: "image/svg+xml" };
  }

  const buffer = await QRCode.toBuffer(options.content, {
    type: "png",
    width: options.size,
    margin: 2,
    color: colorConfig,
  });
  return { body: new Uint8Array(buffer), contentType: "image/png" };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- lib/qr/generate-qr.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/qr/generate-qr.ts lib/qr/generate-qr.test.ts
git commit -m "feat: add server-side QR generation for the public API"
```

---

### Task 7: `GET /api/v1/username-link`

**Files:**
- Create: `app/api/v1/username-link/route.ts`
- Test: `app/api/v1/username-link/route.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// app/api/v1/username-link/route.test.ts
import { describe, expect, it } from "vitest";
import { GET, OPTIONS } from "./route";

function req(query: string): Request {
  return new Request(`http://localhost/api/v1/username-link${query}`);
}

describe("GET /api/v1/username-link", () => {
  it("generates link, shortLink, and notice for a valid username", async () => {
    const res = await GET(req("?username=joao.silva"));
    expect(res.status).toBe(200);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    const body = await res.json();
    expect(body.username).toBe("joao.silva");
    expect(body.link).toBe("https://wa.me/joao.silva");
    expect(body.shortLink).toContain("/joao.silva");
    expect(body.notice).toContain("wa.me");
    expect(body.key).toBeUndefined();
  });

  it("echoes key and encodes text", async () => {
    const res = await GET(req("?username=joao.silva&key=AB12&text=hello world"));
    const body = await res.json();
    expect(body.key).toBe("AB12");
    expect(body.link).toBe("https://wa.me/joao.silva?text=hello%20world");
  });

  it("sanitizes input like the UI does (@ prefix, uppercase)", async () => {
    const res = await GET(req("?username=@Joao.Silva"));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.username).toBe("joao.silva");
  });

  it("400s with missing_username when the param is absent", async () => {
    const res = await GET(req(""));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("missing_username");
  });

  it("400s with a mapped stable code for an invalid username", async () => {
    const res = await GET(req("?username=ab"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("username_length");
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("400s with key_invalid_format for a bad key", async () => {
    const res = await GET(req("?username=joao.silva&key=x"));
    const body = await res.json();
    expect(body.error.code).toBe("key_invalid_format");
  });
});

describe("OPTIONS", () => {
  it("returns 204 with CORS headers", () => {
    const res = OPTIONS();
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- app/api/v1/username-link/route.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```typescript
// app/api/v1/username-link/route.ts
import { createWhatsAppLink } from "@/services/link-service";
import { sanitizeUsernameInput } from "@/utils/validate-username";
import { mapValidationError } from "@/lib/api/error-codes";
import { checkRateLimit } from "@/lib/api/rate-limit";
import {
  apiJson,
  apiError,
  apiOptions,
  apiRateLimited,
  USERNAME_LINK_NOTICE,
} from "@/lib/api/responses";
import { buildShortLink } from "@/lib/short-link";

export async function GET(request: Request): Promise<Response> {
  const rate = await checkRateLimit(request, "json");
  if (!rate.allowed) return apiRateLimited(rate.headers);

  try {
    const { searchParams } = new URL(request.url);
    const rawUsername = searchParams.get("username");

    if (!rawUsername) {
      return apiError(400, "missing_username", 'Query param "username" is required.', rate.headers);
    }

    const username = sanitizeUsernameInput(rawUsername);
    const key = searchParams.get("key") ?? undefined;
    const text = searchParams.get("text") ?? undefined;

    const result = createWhatsAppLink(username, key, text);

    if (!result.success) {
      const { code, message } = mapValidationError(result.errors[0]);
      return apiError(400, code, message, rate.headers);
    }

    return apiJson(
      {
        username: result.link.username,
        ...(result.link.usernameKey ? { key: result.link.usernameKey } : {}),
        link: result.link.url,
        shortLink: buildShortLink(result.link.username),
        notice: USERNAME_LINK_NOTICE,
      },
      rate.headers,
    );
  } catch (error) {
    console.error("[api] username-link failed:", error);
    return apiError(500, "internal_error", "Unexpected error.", rate.headers);
  }
}

export function OPTIONS(): Response {
  return apiOptions();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- app/api/v1/username-link/route.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add app/api/v1/username-link/
git commit -m "feat: add GET /api/v1/username-link endpoint"
```

---

### Task 8: `GET /api/v1/phone-link`

**Files:**
- Create: `app/api/v1/phone-link/route.ts`
- Test: `app/api/v1/phone-link/route.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// app/api/v1/phone-link/route.test.ts
import { describe, expect, it } from "vitest";
import { GET, OPTIONS } from "./route";

function req(query: string): Request {
  return new Request(`http://localhost/api/v1/phone-link${query}`);
}

describe("GET /api/v1/phone-link", () => {
  it("generates a wa.me link for a valid international number", async () => {
    const res = await GET(req("?phone=351912345678"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.phone).toBe("351912345678");
    expect(body.link).toBe("https://wa.me/351912345678");
  });

  it("sanitizes + prefix, spaces, and other symbols", async () => {
    const res = await GET(req(`?phone=${encodeURIComponent("+351 912-345-678")}`));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.phone).toBe("351912345678");
  });

  it("appends the encoded text param", async () => {
    const res = await GET(req("?phone=351912345678&text=ola mundo"));
    const body = await res.json();
    expect(body.link).toBe("https://wa.me/351912345678?text=ola%20mundo");
  });

  it("400s with missing_phone when absent", async () => {
    const res = await GET(req(""));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("missing_phone");
  });

  it("400s with phone_invalid_format for a too-short number", async () => {
    const res = await GET(req("?phone=12345"));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("phone_invalid_format");
  });
});

describe("OPTIONS", () => {
  it("returns 204", () => {
    expect(OPTIONS().status).toBe(204);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- app/api/v1/phone-link/route.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```typescript
// app/api/v1/phone-link/route.ts
import { createPhoneWhatsAppLink } from "@/services/phone-link-service";
import { sanitizePhoneInput } from "@/utils/validate-phone";
import { mapValidationError } from "@/lib/api/error-codes";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { apiJson, apiError, apiOptions, apiRateLimited } from "@/lib/api/responses";

export async function GET(request: Request): Promise<Response> {
  const rate = await checkRateLimit(request, "json");
  if (!rate.allowed) return apiRateLimited(rate.headers);

  try {
    const { searchParams } = new URL(request.url);
    const rawPhone = searchParams.get("phone");

    if (!rawPhone) {
      return apiError(400, "missing_phone", 'Query param "phone" is required (full international number).', rate.headers);
    }

    const phone = sanitizePhoneInput(rawPhone);
    const text = searchParams.get("text") ?? undefined;

    const result = createPhoneWhatsAppLink(phone, text);

    if (!result.success) {
      const { code, message } = mapValidationError(result.errors[0]);
      return apiError(400, code, message, rate.headers);
    }

    return apiJson({ phone: result.link.phone, link: result.link.url }, rate.headers);
  } catch (error) {
    console.error("[api] phone-link failed:", error);
    return apiError(500, "internal_error", "Unexpected error.", rate.headers);
  }
}

export function OPTIONS(): Response {
  return apiOptions();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- app/api/v1/phone-link/route.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add app/api/v1/phone-link/
git commit -m "feat: add GET /api/v1/phone-link endpoint"
```

---

### Task 9: Validation endpoints (`/api/v1/validate/{username,key,phone}`)

Validity is the payload: a well-formed request always gets 200, `valid` true/false with mapped error details. 400 only when the query param itself is missing.

**Files:**
- Create: `app/api/v1/validate/username/route.ts`
- Create: `app/api/v1/validate/key/route.ts`
- Create: `app/api/v1/validate/phone/route.ts`
- Test: `app/api/v1/validate/validate-routes.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// app/api/v1/validate/validate-routes.test.ts
import { describe, expect, it } from "vitest";
import { GET as getUsername } from "./username/route";
import { GET as getKey } from "./key/route";
import { GET as getPhone } from "./phone/route";

function req(path: string, query: string): Request {
  return new Request(`http://localhost/api/v1/validate/${path}${query}`);
}

describe("GET /api/v1/validate/username", () => {
  it("returns valid=true for a good username", async () => {
    const res = await getUsername(req("username", "?username=joao.silva"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ valid: true, errors: [] });
  });

  it("returns 200 valid=false with mapped codes for a bad username", async () => {
    const res = await getUsername(req("username", "?username=ab"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.valid).toBe(false);
    expect(body.errors[0].code).toBe("username_length");
    expect(body.errors[0].message).toBeDefined();
  });

  it("sanitizes before validating (uppercase @handle passes)", async () => {
    const res = await getUsername(req("username", "?username=@Joao.Silva"));
    expect((await res.json()).valid).toBe(true);
  });

  it("400s when the param is missing", async () => {
    const res = await getUsername(req("username", ""));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("missing_username");
  });
});

describe("GET /api/v1/validate/key", () => {
  it("valid key → valid=true", async () => {
    const res = await getKey(req("key", "?key=AB12"));
    expect(await res.json()).toEqual({ valid: true, errors: [] });
  });

  it("invalid key → valid=false with key_invalid_format", async () => {
    const body = await (await getKey(req("key", "?key=x"))).json();
    expect(body.valid).toBe(false);
    expect(body.errors[0].code).toBe("key_invalid_format");
  });

  it("missing param → 400 missing_key", async () => {
    const res = await getKey(req("key", ""));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("missing_key");
  });
});

describe("GET /api/v1/validate/phone", () => {
  it("valid phone (with symbols, sanitized) → valid=true", async () => {
    const res = await getPhone(req("phone", `?phone=${encodeURIComponent("+351 912 345 678")}`));
    expect(await res.json()).toEqual({ valid: true, errors: [] });
  });

  it("invalid phone → valid=false with phone_invalid_format", async () => {
    const body = await (await getPhone(req("phone", "?phone=123"))).json();
    expect(body.valid).toBe(false);
    expect(body.errors[0].code).toBe("phone_invalid_format");
  });

  it("missing param → 400 missing_phone", async () => {
    const res = await getPhone(req("phone", ""));
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- app/api/v1/validate/validate-routes.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Write the three implementations**

```typescript
// app/api/v1/validate/username/route.ts
import { sanitizeUsernameInput, validateUsername } from "@/utils/validate-username";
import { mapValidationError } from "@/lib/api/error-codes";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { apiJson, apiError, apiOptions, apiRateLimited } from "@/lib/api/responses";

export async function GET(request: Request): Promise<Response> {
  const rate = await checkRateLimit(request, "json");
  if (!rate.allowed) return apiRateLimited(rate.headers);

  const raw = new URL(request.url).searchParams.get("username");
  if (raw === null || raw === "") {
    return apiError(400, "missing_username", 'Query param "username" is required.', rate.headers);
  }

  const validation = validateUsername(sanitizeUsernameInput(raw));
  return apiJson(
    { valid: validation.valid, errors: validation.errors.map(mapValidationError) },
    rate.headers,
  );
}

export function OPTIONS(): Response {
  return apiOptions();
}
```

```typescript
// app/api/v1/validate/key/route.ts
import { validateUsernameKey } from "@/utils/validate-username-key";
import { mapValidationError } from "@/lib/api/error-codes";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { apiJson, apiError, apiOptions, apiRateLimited } from "@/lib/api/responses";

export async function GET(request: Request): Promise<Response> {
  const rate = await checkRateLimit(request, "json");
  if (!rate.allowed) return apiRateLimited(rate.headers);

  const raw = new URL(request.url).searchParams.get("key");
  if (raw === null || raw === "") {
    return apiError(400, "missing_key", 'Query param "key" is required.', rate.headers);
  }

  const validation = validateUsernameKey(raw.trim());
  return apiJson(
    { valid: validation.valid, errors: validation.errors.map(mapValidationError) },
    rate.headers,
  );
}

export function OPTIONS(): Response {
  return apiOptions();
}
```

```typescript
// app/api/v1/validate/phone/route.ts
import { sanitizePhoneInput, validatePhoneNumber } from "@/utils/validate-phone";
import { mapValidationError } from "@/lib/api/error-codes";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { apiJson, apiError, apiOptions, apiRateLimited } from "@/lib/api/responses";

export async function GET(request: Request): Promise<Response> {
  const rate = await checkRateLimit(request, "json");
  if (!rate.allowed) return apiRateLimited(rate.headers);

  const raw = new URL(request.url).searchParams.get("phone");
  if (raw === null || raw === "") {
    return apiError(400, "missing_phone", 'Query param "phone" is required.', rate.headers);
  }

  const validation = validatePhoneNumber(sanitizePhoneInput(raw));
  return apiJson(
    { valid: validation.valid, errors: validation.errors.map(mapValidationError) },
    rate.headers,
  );
}

export function OPTIONS(): Response {
  return apiOptions();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- app/api/v1/validate/validate-routes.test.ts`
Expected: PASS (10 tests).

- [ ] **Step 5: Commit**

```bash
git add app/api/v1/validate/
git commit -m "feat: add /api/v1/validate endpoints for username, key, phone"
```

---

### Task 10: `GET /api/v1/qr`

Image response. Only encodes wa.me links built from a validated `username` or `phone` — never arbitrary content (anti-phishing, per spec).

**Files:**
- Create: `app/api/v1/qr/route.ts`
- Test: `app/api/v1/qr/route.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// app/api/v1/qr/route.test.ts
import { describe, expect, it } from "vitest";
import { GET, OPTIONS } from "./route";

function req(query: string): Request {
  return new Request(`http://localhost/api/v1/qr${query}`);
}

describe("GET /api/v1/qr", () => {
  it("returns a PNG for a valid username", async () => {
    const res = await GET(req("?username=joao.silva"));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    const bytes = new Uint8Array(await res.arrayBuffer());
    expect(bytes[0]).toBe(0x89);
  });

  it("returns an SVG when format=svg", async () => {
    const res = await GET(req("?phone=351912345678&format=svg"));
    expect(res.headers.get("Content-Type")).toBe("image/svg+xml");
    expect(await res.text()).toContain("<svg");
  });

  it("400s when both username and phone are given", async () => {
    const res = await GET(req("?username=joao&phone=351912345678"));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("missing_target");
  });

  it("400s when neither is given", async () => {
    const res = await GET(req(""));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("missing_target");
  });

  it("400s on invalid username with the mapped code", async () => {
    const res = await GET(req("?username=ab"));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("username_length");
  });

  it("400s on bad format", async () => {
    const res = await GET(req("?username=joao.silva&format=gif"));
    expect((await res.json()).error.code).toBe("invalid_format");
  });

  it("400s on out-of-range size", async () => {
    const res = await GET(req("?username=joao.silva&size=4096"));
    expect((await res.json()).error.code).toBe("invalid_size");
  });

  it("400s on malformed color", async () => {
    const res = await GET(req("?username=joao.silva&color=red"));
    expect((await res.json()).error.code).toBe("invalid_color");
  });

  it("accepts bg=transparent", async () => {
    const res = await GET(req("?username=joao.silva&bg=transparent"));
    expect(res.status).toBe(200);
  });
});

describe("OPTIONS", () => {
  it("returns 204", () => {
    expect(OPTIONS().status).toBe(204);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- app/api/v1/qr/route.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```typescript
// app/api/v1/qr/route.ts
import { createWhatsAppLink } from "@/services/link-service";
import { createPhoneWhatsAppLink } from "@/services/phone-link-service";
import { sanitizeUsernameInput } from "@/utils/validate-username";
import { sanitizePhoneInput } from "@/utils/validate-phone";
import { mapValidationError } from "@/lib/api/error-codes";
import { checkRateLimit } from "@/lib/api/rate-limit";
import {
  apiError,
  apiOptions,
  apiRateLimited,
  API_CORS_HEADERS,
  API_SUCCESS_CACHE_CONTROL,
} from "@/lib/api/responses";
import { generateQr } from "@/lib/qr/generate-qr";

const HEX_COLOR_REGEX = /^[0-9a-fA-F]{6}$/;
const MIN_SIZE = 128;
const MAX_SIZE = 1024;

export async function GET(request: Request): Promise<Response> {
  const rate = await checkRateLimit(request, "qr");
  if (!rate.allowed) return apiRateLimited(rate.headers);

  try {
    const { searchParams } = new URL(request.url);
    const rawUsername = searchParams.get("username");
    const rawPhone = searchParams.get("phone");

    // Exactly one target: XOR — reject both-present and both-absent.
    if ((rawUsername === null) === (rawPhone === null)) {
      return apiError(400, "missing_target", 'Provide exactly one of "username" or "phone".', rate.headers);
    }

    const text = searchParams.get("text") ?? undefined;

    let link: string;
    if (rawUsername !== null) {
      const result = createWhatsAppLink(sanitizeUsernameInput(rawUsername), undefined, text);
      if (!result.success) {
        const { code, message } = mapValidationError(result.errors[0]);
        return apiError(400, code, message, rate.headers);
      }
      link = result.link.url;
    } else {
      const result = createPhoneWhatsAppLink(sanitizePhoneInput(rawPhone as string), text);
      if (!result.success) {
        const { code, message } = mapValidationError(result.errors[0]);
        return apiError(400, code, message, rate.headers);
      }
      link = result.link.url;
    }

    const format = searchParams.get("format") ?? "png";
    if (format !== "png" && format !== "svg") {
      return apiError(400, "invalid_format", 'format must be "png" or "svg".', rate.headers);
    }

    const size = Number(searchParams.get("size") ?? "512");
    if (!Number.isInteger(size) || size < MIN_SIZE || size > MAX_SIZE) {
      return apiError(400, "invalid_size", `size must be an integer between ${MIN_SIZE} and ${MAX_SIZE}.`, rate.headers);
    }

    const color = searchParams.get("color") ?? "000000";
    if (!HEX_COLOR_REGEX.test(color)) {
      return apiError(400, "invalid_color", "color must be a 6-digit hex value without #.", rate.headers);
    }

    const bg = searchParams.get("bg") ?? "ffffff";
    if (bg !== "transparent" && !HEX_COLOR_REGEX.test(bg)) {
      return apiError(400, "invalid_bg", 'bg must be a 6-digit hex value without #, or "transparent".', rate.headers);
    }

    const qr = await generateQr({
      content: link,
      format,
      size,
      color: `#${color}`,
      background: bg === "transparent" ? "#ffffff00" : `#${bg}`,
    });

    return new Response(qr.body, {
      headers: {
        ...API_CORS_HEADERS,
        "Content-Type": qr.contentType,
        "Cache-Control": API_SUCCESS_CACHE_CONTROL,
        ...rate.headers,
      },
    });
  } catch (error) {
    console.error("[api] qr failed:", error);
    return apiError(500, "internal_error", "Unexpected error.", rate.headers);
  }
}

export function OPTIONS(): Response {
  return apiOptions();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- app/api/v1/qr/route.test.ts`
Expected: PASS (10 tests).

- [ ] **Step 5: Commit**

```bash
git add app/api/v1/qr/
git commit -m "feat: add GET /api/v1/qr endpoint (PNG/SVG, wa.me links only)"
```

---

### Task 11: OpenAPI spec (`lib/api/openapi.ts` + `/api/v1/openapi.json`)

**Files:**
- Create: `lib/api/openapi.ts`
- Create: `app/api/v1/openapi.json/route.ts`
- Test: `lib/api/openapi.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// lib/api/openapi.test.ts
import { describe, expect, it } from "vitest";
import { openApiDocument } from "@/lib/api/openapi";

describe("openApiDocument", () => {
  it("declares OpenAPI 3.1 and all seven v1 paths", () => {
    expect(openApiDocument.openapi).toBe("3.1.0");
    const paths = Object.keys(openApiDocument.paths);
    expect(paths.sort()).toEqual(
      [
        "/api/v1/username-link",
        "/api/v1/phone-link",
        "/api/v1/validate/username",
        "/api/v1/validate/key",
        "/api/v1/validate/phone",
        "/api/v1/qr",
        "/api/v1/openapi.json",
      ].sort(),
    );
  });

  it("is JSON-serializable", () => {
    expect(() => JSON.stringify(openApiDocument)).not.toThrow();
  });

  it("every path has a get operation with at least one 200 response", () => {
    for (const [path, item] of Object.entries(openApiDocument.paths)) {
      expect(item.get, `${path} missing get`).toBeDefined();
      expect(item.get.responses["200"], `${path} missing 200`).toBeDefined();
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- lib/api/openapi.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```typescript
// lib/api/openapi.ts
import { siteConfig } from "@/config/site";

interface Operation {
  get: {
    summary: string;
    parameters?: unknown[];
    responses: Record<string, unknown>;
  };
}

function queryParam(name: string, required: boolean, description: string, schema: object = { type: "string" }) {
  return { name, in: "query", required, description, schema };
}

const errorResponse = {
  description: "Error",
  content: {
    "application/json": {
      schema: { $ref: "#/components/schemas/Error" },
    },
  },
};

const rateLimitResponses = {
  "429": { ...errorResponse, description: "Rate limit exceeded (60/min JSON, 20/min QR, per IP). Includes Retry-After." },
};

export const openApiDocument: { openapi: string; info: object; servers: object[]; paths: Record<string, Operation>; components: object } = {
  openapi: "3.1.0",
  info: {
    title: "WhatsUsernames.link Public API",
    version: "1.0.0",
    description:
      "Free, keyless API for generating WhatsApp links and QR codes from usernames or phone numbers. " +
      "Rate limited per IP: 60 req/min (JSON endpoints), 20 req/min (/qr). All responses include CORS headers. " +
      "Note: wa.me/<username> links are in a phased WhatsApp rollout and may not resolve yet — see /llms.txt for current status.",
  },
  servers: [{ url: siteConfig.url }],
  paths: {
    "/api/v1/username-link": {
      get: {
        summary: "Generate a WhatsApp link and short link from a username",
        parameters: [
          queryParam("username", true, "WhatsApp username (3-35 chars, lowercase letters, digits, dots, underscores)."),
          queryParam("key", false, "Optional WhatsApp Username Key (4-8 letters/numbers)."),
          queryParam("text", false, "Optional prefilled message."),
        ],
        responses: {
          "200": {
            description: "Generated links",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/UsernameLink" },
                example: {
                  username: "joao.silva",
                  key: "AB12",
                  link: "https://wa.me/joao.silva?text=hello",
                  shortLink: `${siteConfig.url}/joao.silva`,
                  notice: "As of 2026-07-04, wa.me/<username> links do not yet open a chat for most accounts...",
                },
              },
            },
          },
          "400": errorResponse,
          ...rateLimitResponses,
        },
      },
    },
    "/api/v1/phone-link": {
      get: {
        summary: "Generate a WhatsApp click-to-chat link from a phone number",
        parameters: [
          queryParam("phone", true, "Full international number including country code. Symbols/spaces are stripped."),
          queryParam("text", false, "Optional prefilled message."),
        ],
        responses: {
          "200": {
            description: "Generated link",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/PhoneLink" },
                example: { phone: "351912345678", link: "https://wa.me/351912345678" },
              },
            },
          },
          "400": errorResponse,
          ...rateLimitResponses,
        },
      },
    },
    "/api/v1/validate/username": {
      get: {
        summary: "Validate a WhatsApp username",
        parameters: [queryParam("username", true, "Username to validate.")],
        responses: {
          "200": {
            description: "Validation verdict (always 200 for a well-formed request)",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Validation" } } },
          },
          "400": errorResponse,
          ...rateLimitResponses,
        },
      },
    },
    "/api/v1/validate/key": {
      get: {
        summary: "Validate a WhatsApp Username Key",
        parameters: [queryParam("key", true, "Key to validate (4-8 letters/numbers).")],
        responses: {
          "200": {
            description: "Validation verdict",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Validation" } } },
          },
          "400": errorResponse,
          ...rateLimitResponses,
        },
      },
    },
    "/api/v1/validate/phone": {
      get: {
        summary: "Validate an international phone number for WhatsApp links",
        parameters: [queryParam("phone", true, "Phone number to validate.")],
        responses: {
          "200": {
            description: "Validation verdict",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Validation" } } },
          },
          "400": errorResponse,
          ...rateLimitResponses,
        },
      },
    },
    "/api/v1/qr": {
      get: {
        summary: "Generate a QR code image for a WhatsApp link",
        parameters: [
          queryParam("username", false, "WhatsApp username. Provide exactly one of username or phone."),
          queryParam("phone", false, "Phone number. Provide exactly one of username or phone."),
          queryParam("text", false, "Optional prefilled message."),
          queryParam("format", false, "png (default) or svg.", { type: "string", enum: ["png", "svg"] }),
          queryParam("size", false, "PNG width in pixels, 128-1024, default 512.", { type: "integer", minimum: 128, maximum: 1024 }),
          queryParam("color", false, "Foreground hex without #, default 000000."),
          queryParam("bg", false, 'Background hex without #, or "transparent". Default ffffff.'),
        ],
        responses: {
          "200": {
            description: "QR image",
            content: { "image/png": { schema: { type: "string", format: "binary" } }, "image/svg+xml": { schema: { type: "string" } } },
          },
          "400": errorResponse,
          ...rateLimitResponses,
        },
      },
    },
    "/api/v1/openapi.json": {
      get: {
        summary: "This document",
        responses: { "200": { description: "OpenAPI 3.1 document", content: { "application/json": {} } } },
      },
    },
  },
  components: {
    schemas: {
      Error: {
        type: "object",
        properties: {
          error: {
            type: "object",
            properties: { code: { type: "string" }, message: { type: "string" } },
            required: ["code", "message"],
          },
        },
        required: ["error"],
      },
      Validation: {
        type: "object",
        properties: {
          valid: { type: "boolean" },
          errors: {
            type: "array",
            items: {
              type: "object",
              properties: { code: { type: "string" }, message: { type: "string" } },
            },
          },
        },
        required: ["valid", "errors"],
      },
      UsernameLink: {
        type: "object",
        properties: {
          username: { type: "string" },
          key: { type: "string" },
          link: { type: "string" },
          shortLink: { type: "string" },
          notice: { type: "string" },
        },
        required: ["username", "link", "shortLink", "notice"],
      },
      PhoneLink: {
        type: "object",
        properties: { phone: { type: "string" }, link: { type: "string" } },
        required: ["phone", "link"],
      },
    },
  },
};
```

```typescript
// app/api/v1/openapi.json/route.ts
import { openApiDocument } from "@/lib/api/openapi";
import { API_CORS_HEADERS, API_SUCCESS_CACHE_CONTROL } from "@/lib/api/responses";

export const dynamic = "force-static";

export function GET(): Response {
  return Response.json(openApiDocument, {
    headers: { ...API_CORS_HEADERS, "Cache-Control": API_SUCCESS_CACHE_CONTROL },
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- lib/api/openapi.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/api/openapi.ts lib/api/openapi.test.ts app/api/v1/openapi.json/
git commit -m "feat: serve OpenAPI 3.1 spec at /api/v1/openapi.json"
```

---

### Task 12: `/developers` page (EN/PT/ES) + footer + sitemap + llms.txt

**Files:**
- Create: `app/[locale]/developers/page.tsx`
- Modify: `messages/en.json`, `messages/pt.json`, `messages/es.json` (new `developers` namespace + `footer.apiLink`)
- Modify: `app/[locale]/page.tsx` (footer link)
- Modify: `app/sitemap.ts` (add `entries("developers", 0.6)`)
- Modify: `app/llms.txt/route.ts` (API section)

- [ ] **Step 1: Add i18n messages**

Add to `messages/en.json` — inside `footer`, add `"apiLink": "API"`, and add a top-level namespace:

```json
"developers": {
  "title": "Free WhatsApp Link API for Developers",
  "metaDescription": "Free public REST API to generate WhatsApp links and QR codes from usernames or phone numbers. No API key, no signup. JSON responses, CORS enabled.",
  "intro": "Generate WhatsApp links, validate usernames and phone numbers, and render QR codes over plain HTTP GET. No API key, no signup, free. All endpoints return JSON (the QR endpoint returns an image), send CORS headers, and are safe to call from browsers.",
  "endpointsHeading": "Endpoints",
  "endpointsIntro": "Base URL: {baseUrl}. All endpoints are GET.",
  "tableEndpoint": "Endpoint",
  "tableDescription": "Description",
  "endpointDescriptions": {
    "usernameLink": "WhatsApp link + short link from a username (optional key and prefilled text).",
    "phoneLink": "Official wa.me click-to-chat link from an international phone number.",
    "validateUsername": "Check whether a username is structurally valid.",
    "validateKey": "Check whether a Username Key is valid (4-8 letters/numbers).",
    "validatePhone": "Check whether a phone number is valid for WhatsApp links.",
    "qr": "QR code (PNG or SVG) for a username or phone link. Custom size and colors.",
    "openapi": "Machine-readable OpenAPI 3.1 description of this API."
  },
  "examplesHeading": "Examples",
  "exampleCurlLabel": "curl",
  "exampleJsLabel": "JavaScript (fetch)",
  "rateLimitHeading": "Rate limits",
  "rateLimitBody": "60 requests per minute per IP for JSON endpoints, 20 per minute for the QR endpoint. Responses include X-RateLimit-Limit, X-RateLimit-Remaining, and X-RateLimit-Reset headers; exceeding the limit returns HTTP 429 with a Retry-After header. Identical requests are served from CDN cache and don't count against the limit.",
  "errorsHeading": "Errors",
  "errorsBody": "Errors are always JSON with a stable machine-readable code: for example a bad username returns HTTP 400 with a body like the one below. Codes never change within v1.",
  "noticeHeading": "About wa.me username links",
  "noticeBody": "WhatsApp's username feature is in a phased regional rollout, and wa.me/<username> links may not open a chat for every account yet. The username-link endpoint includes a notice field with the current status. Phone-number links (wa.me/<phone>) are officially documented and work everywhere today.",
  "openapiLinkLabel": "OpenAPI 3.1 specification"
}
```

Add to `messages/pt.json` — `"apiLink": "API"` in `footer`, plus:

```json
"developers": {
  "title": "API Gratuita de Links do WhatsApp para Programadores",
  "metaDescription": "API REST pública e gratuita para gerar links do WhatsApp e códigos QR a partir de usernames ou números de telefone. Sem chave de API, sem registo. Respostas JSON, CORS ativo.",
  "intro": "Gere links do WhatsApp, valide usernames e números de telefone e crie códigos QR com simples pedidos HTTP GET. Sem chave de API, sem registo, grátis. Todos os endpoints devolvem JSON (o endpoint QR devolve uma imagem), enviam cabeçalhos CORS e podem ser chamados diretamente do browser.",
  "endpointsHeading": "Endpoints",
  "endpointsIntro": "URL base: {baseUrl}. Todos os endpoints são GET.",
  "tableEndpoint": "Endpoint",
  "tableDescription": "Descrição",
  "endpointDescriptions": {
    "usernameLink": "Link do WhatsApp + link curto a partir de um username (key e texto pré-preenchido opcionais).",
    "phoneLink": "Link oficial wa.me click-to-chat a partir de um número de telefone internacional.",
    "validateUsername": "Verifica se um username é estruturalmente válido.",
    "validateKey": "Verifica se uma Username Key é válida (4-8 letras/números).",
    "validatePhone": "Verifica se um número de telefone é válido para links do WhatsApp.",
    "qr": "Código QR (PNG ou SVG) para um link de username ou telefone. Tamanho e cores personalizáveis.",
    "openapi": "Descrição OpenAPI 3.1 desta API, legível por máquinas."
  },
  "examplesHeading": "Exemplos",
  "exampleCurlLabel": "curl",
  "exampleJsLabel": "JavaScript (fetch)",
  "rateLimitHeading": "Limites de utilização",
  "rateLimitBody": "60 pedidos por minuto por IP nos endpoints JSON, 20 por minuto no endpoint QR. As respostas incluem os cabeçalhos X-RateLimit-Limit, X-RateLimit-Remaining e X-RateLimit-Reset; exceder o limite devolve HTTP 429 com cabeçalho Retry-After. Pedidos idênticos são servidos da cache CDN e não contam para o limite.",
  "errorsHeading": "Erros",
  "errorsBody": "Os erros são sempre JSON com um código estável legível por máquinas: por exemplo, um username inválido devolve HTTP 400 com um corpo como o abaixo. Os códigos nunca mudam dentro da v1.",
  "noticeHeading": "Sobre links wa.me de username",
  "noticeBody": "A funcionalidade de usernames do WhatsApp está em rollout regional faseado, e os links wa.me/<username> podem ainda não abrir conversa para todas as contas. O endpoint username-link inclui um campo notice com o estado atual. Os links por número de telefone (wa.me/<telefone>) são oficialmente documentados e funcionam para todos hoje.",
  "openapiLinkLabel": "Especificação OpenAPI 3.1"
}
```

Add to `messages/es.json` — `"apiLink": "API"` in `footer`, plus:

```json
"developers": {
  "title": "API Gratuita de Enlaces de WhatsApp para Desarrolladores",
  "metaDescription": "API REST pública y gratuita para generar enlaces de WhatsApp y códigos QR a partir de usernames o números de teléfono. Sin clave de API, sin registro. Respuestas JSON, CORS habilitado.",
  "intro": "Genera enlaces de WhatsApp, valida usernames y números de teléfono y crea códigos QR con simples peticiones HTTP GET. Sin clave de API, sin registro, gratis. Todos los endpoints devuelven JSON (el endpoint QR devuelve una imagen), envían cabeceras CORS y pueden llamarse directamente desde el navegador.",
  "endpointsHeading": "Endpoints",
  "endpointsIntro": "URL base: {baseUrl}. Todos los endpoints son GET.",
  "tableEndpoint": "Endpoint",
  "tableDescription": "Descripción",
  "endpointDescriptions": {
    "usernameLink": "Enlace de WhatsApp + enlace corto a partir de un username (key y texto predefinido opcionales).",
    "phoneLink": "Enlace oficial wa.me click-to-chat a partir de un número de teléfono internacional.",
    "validateUsername": "Comprueba si un username es estructuralmente válido.",
    "validateKey": "Comprueba si una Username Key es válida (4-8 letras/números).",
    "validatePhone": "Comprueba si un número de teléfono es válido para enlaces de WhatsApp.",
    "qr": "Código QR (PNG o SVG) para un enlace de username o teléfono. Tamaño y colores personalizables.",
    "openapi": "Descripción OpenAPI 3.1 de esta API, legible por máquinas."
  },
  "examplesHeading": "Ejemplos",
  "exampleCurlLabel": "curl",
  "exampleJsLabel": "JavaScript (fetch)",
  "rateLimitHeading": "Límites de uso",
  "rateLimitBody": "60 peticiones por minuto por IP en los endpoints JSON, 20 por minuto en el endpoint QR. Las respuestas incluyen las cabeceras X-RateLimit-Limit, X-RateLimit-Remaining y X-RateLimit-Reset; superar el límite devuelve HTTP 429 con cabecera Retry-After. Las peticiones idénticas se sirven desde la caché CDN y no cuentan para el límite.",
  "errorsHeading": "Errores",
  "errorsBody": "Los errores son siempre JSON con un código estable legible por máquinas: por ejemplo, un username inválido devuelve HTTP 400 con un cuerpo como el de abajo. Los códigos nunca cambian dentro de la v1.",
  "noticeHeading": "Sobre los enlaces wa.me de username",
  "noticeBody": "La función de usernames de WhatsApp está en despliegue regional por fases, y los enlaces wa.me/<username> pueden aún no abrir un chat para todas las cuentas. El endpoint username-link incluye un campo notice con el estado actual. Los enlaces por número de teléfono (wa.me/<teléfono>) están oficialmente documentados y funcionan para todos hoy.",
  "openapiLinkLabel": "Especificación OpenAPI 3.1"
}
```

- [ ] **Step 2: Create the page**

```tsx
// app/[locale]/developers/page.tsx
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { siteConfig } from "@/config/site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "developers" });
  const path = locale === routing.defaultLocale ? "/developers" : `/${locale}/developers`;

  return {
    title: t("title"),
    description: t("metaDescription"),
    alternates: { canonical: path },
    openGraph: {
      title: t("title"),
      description: t("metaDescription"),
      url: path,
      siteName: siteConfig.name,
      type: "website",
    },
  };
}

const ENDPOINTS = [
  { path: "/api/v1/username-link?username=joao.silva&key=AB12&text=hello", descKey: "usernameLink" },
  { path: "/api/v1/phone-link?phone=351912345678&text=hello", descKey: "phoneLink" },
  { path: "/api/v1/validate/username?username=joao.silva", descKey: "validateUsername" },
  { path: "/api/v1/validate/key?key=AB12", descKey: "validateKey" },
  { path: "/api/v1/validate/phone?phone=351912345678", descKey: "validatePhone" },
  { path: "/api/v1/qr?username=joao.silva&format=svg&color=25d366", descKey: "qr" },
  { path: "/api/v1/openapi.json", descKey: "openapi" },
] as const;

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-lg bg-muted px-4 py-3 font-mono text-sm">
      <code>{children}</code>
    </pre>
  );
}

export default async function DevelopersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "developers" });

  const curlExample = `curl "${siteConfig.url}/api/v1/username-link?username=joao.silva"`;
  const jsExample = `const res = await fetch(
  "${siteConfig.url}/api/v1/username-link?username=joao.silva"
);
const data = await res.json();
console.log(data.link); // https://wa.me/joao.silva`;
  const errorExample = `{
  "error": {
    "code": "username_length",
    "message": "Username must be 3-35 characters."
  }
}`;

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 px-4 py-24">
      <div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{t("title")}</h1>
        <p className="mt-4 text-muted-foreground">{t("intro")}</p>
      </div>

      <div>
        <h2 className="mb-2 text-xl font-semibold">{t("endpointsHeading")}</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          {t("endpointsIntro", { baseUrl: siteConfig.url })}
        </p>
        <div className="flex flex-col gap-4">
          {ENDPOINTS.map((endpoint) => (
            <div key={endpoint.descKey}>
              <CodeBlock>{`GET ${endpoint.path}`}</CodeBlock>
              <p className="mt-1 text-sm text-muted-foreground">
                {t(`endpointDescriptions.${endpoint.descKey}`)}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-4 text-xl font-semibold">{t("examplesHeading")}</h2>
        <p className="mb-1 text-sm font-medium">{t("exampleCurlLabel")}</p>
        <CodeBlock>{curlExample}</CodeBlock>
        <p className="mb-1 mt-4 text-sm font-medium">{t("exampleJsLabel")}</p>
        <CodeBlock>{jsExample}</CodeBlock>
      </div>

      <div>
        <h2 className="mb-2 text-xl font-semibold">{t("rateLimitHeading")}</h2>
        <p className="text-sm text-muted-foreground">{t("rateLimitBody")}</p>
      </div>

      <div>
        <h2 className="mb-2 text-xl font-semibold">{t("errorsHeading")}</h2>
        <p className="mb-4 text-sm text-muted-foreground">{t("errorsBody")}</p>
        <CodeBlock>{errorExample}</CodeBlock>
      </div>

      <div>
        <h2 className="mb-2 text-xl font-semibold">{t("noticeHeading")}</h2>
        <p className="text-sm text-muted-foreground">{t("noticeBody")}</p>
      </div>

      <a
        href="/api/v1/openapi.json"
        className="text-sm text-muted-foreground underline underline-offset-4"
      >
        {t("openapiLinkLabel")}
      </a>
    </main>
  );
}
```

- [ ] **Step 3: Footer link on the home page**

In `app/[locale]/page.tsx`, inside the `<div className="flex gap-4 text-xs text-muted-foreground">` block, add BEFORE the blog link:

```tsx
<Link href="/developers" className="underline underline-offset-4">
  {t("apiLink")}
</Link>
```

- [ ] **Step 4: Sitemap entry**

In `app/sitemap.ts`, in the returned array of `sitemap()`, add after the how-to entry:

```typescript
...entries("developers", 0.6),
```

- [ ] **Step 5: llms.txt API section**

In `app/llms.txt/route.ts`, add a new section to the template string right before the `## Structured data` section:

```
## Public API (free, no key)
Programmatic access at ${siteConfig.url}/api/v1/ — GET endpoints for generating WhatsApp links (username-link, phone-link), validating inputs (validate/username, validate/key, validate/phone), and rendering QR codes (qr, PNG/SVG). Rate limited per IP (60/min JSON, 20/min QR). Machine-readable spec: ${siteConfig.url}/api/v1/openapi.json — human docs: ${siteConfig.url}/developers
```

- [ ] **Step 6: Verify locales render**

```bash
rm -rf .next && pnpm build
```

Expected: build succeeds. Then:

```bash
pnpm dev --port 3100 &
sleep 8
curl -s http://localhost:3100/developers | grep -o "<title>[^<]*" | head -1
curl -s http://localhost:3100/pt/developers | grep -o "<title>[^<]*" | head -1
curl -s http://localhost:3100/es/developers | grep -o "<title>[^<]*" | head -1
curl -s http://localhost:3100/llms.txt | grep "Public API"
kill %1
```

Expected: three localized titles (English/Portuguese/Spanish), llms.txt shows the API section.

- [ ] **Step 7: Full test suite + lint + typecheck**

```bash
pnpm test && npx tsc --noEmit && pnpm lint
```

Expected: all green.

- [ ] **Step 8: Commit**

```bash
git add app/[locale]/developers/ messages/ app/[locale]/page.tsx app/sitemap.ts app/llms.txt/route.ts
git commit -m "feat: add trilingual /developers docs page, footer link, sitemap and llms.txt entries"
```

---

### Task 13: Regression test + final verification

Spec requires proving `/api/v1/*` is never captured by the `[locale]/[username]` redirect route.

**Files:**
- Create: `app/[locale]/[username]/route.test.ts`

- [ ] **Step 1: Write the regression test**

```typescript
// app/[locale]/[username]/route.test.ts
import { describe, expect, it } from "vitest";
import { GET } from "./route";

function call(locale: string, username: string) {
  return GET(new Request(`http://localhost/${locale}/${username}`), {
    params: Promise.resolve({ locale, username }),
  });
}

describe("[locale]/[username] redirect route", () => {
  it("404s for non-locale first segments like 'api' (never redirects API paths)", async () => {
    const res = await call("api", "v1");
    expect(res.status).toBe(404);
  });

  it("still 307-redirects a valid locale + username", async () => {
    const res = await call("en", "joao.silva");
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://wa.me/joao.silva");
  });
});
```

- [ ] **Step 2: Run it**

Run: `pnpm test -- app/[locale]/[username]/route.test.ts`
Expected: PASS (2 tests) — the route already validates locale (fix `6138e84`); this pins the behavior.

- [ ] **Step 3: Full verification suite**

```bash
pnpm test
rm -rf .next && npx tsc --noEmit
pnpm lint
pnpm build
```

Expected: everything green. Report actual output, not assumptions.

- [ ] **Step 4: Commit**

```bash
git add "app/[locale]/[username]/route.test.ts"
git commit -m "test: pin that /api paths are never captured by the username redirect"
```

---

### Task 14: Deploy + production smoke test

**Pre-requisite:** Upstash env vars present on Vercel (Task 1 Step 2). If still missing, ask the user to install the Upstash integration first — deploying without them works but ships with rate limiting disabled (fail-open), which is acceptable for a preview but not for announcing the API publicly.

- [ ] **Step 1: Deploy**

```bash
cd /root/whatsuser-link
git push origin master   # or open PR per session convention — coordinator decides
vercel --prod
```

Expected: deployment READY, aliased to `https://whatsusernames.link`.

- [ ] **Step 2: Smoke test every endpoint**

```bash
BASE="https://whatsusernames.link"
curl -sS "$BASE/api/v1/username-link?username=joao.silva" | head -c 400; echo
curl -sS "$BASE/api/v1/phone-link?phone=351912345678&text=ola" | head -c 400; echo
curl -sS "$BASE/api/v1/validate/username?username=ab" | head -c 400; echo
curl -sS "$BASE/api/v1/validate/key?key=AB12" | head -c 400; echo
curl -sS "$BASE/api/v1/validate/phone?phone=123" | head -c 400; echo
curl -sS -o /tmp/qr.png -w "%{http_code} %{content_type}\n" "$BASE/api/v1/qr?username=joao.silva"
curl -sS "$BASE/api/v1/openapi.json" | head -c 200; echo
curl -sSI "$BASE/api/v1/username-link?username=joao.silva" | grep -iE "access-control|cache-control|x-ratelimit"
```

Expected: correct JSON bodies, `200 image/png` for QR, CORS + cache headers present, `X-RateLimit-*` present (absent only if Upstash not configured).

- [ ] **Step 3: Verify the 429 path (only if Upstash configured)**

```bash
for i in $(seq 1 70); do
  curl -s -o /dev/null -w "%{http_code}\n" "https://whatsusernames.link/api/v1/validate/username?username=smoke-test-$i-$RANDOM"
done | sort | uniq -c
```

Expected: mostly 200s then 429s near the end (unique params bypass CDN cache, so each hits the limiter).

- [ ] **Step 4: Docs page live + search ping**

```bash
curl -s "https://whatsusernames.link/developers" | grep -o "<title>[^<]*"
curl -s "https://whatsusernames.link/sitemap.xml" | grep -c developers
curl -sS -X POST "https://api.indexnow.org/indexnow" \
  -H "Content-Type: application/json" \
  -d '{
    "host": "whatsusernames.link",
    "key": "904d485b6ea58b91c16938ff219d5d05",
    "keyLocation": "https://whatsusernames.link/904d485b6ea58b91c16938ff219d5d05.txt",
    "urlList": [
      "https://whatsusernames.link/developers",
      "https://whatsusernames.link/pt/developers",
      "https://whatsusernames.link/es/developers"
    ]
  }' -w "\n%{http_code}\n"
```

Expected: title present, 3 sitemap matches, IndexNow returns 200/202.

- [ ] **Step 5: Report results**

Summarize actual smoke-test output to the user, including whether rate limiting is live or fail-open (Upstash pending).

---

## Self-review notes

- **Spec coverage:** endpoints (Tasks 7-11), common behavior/CORS/cache/errors (Task 3, exercised in every route test), rate limiting (Task 4), QR restriction (Task 10 XOR check), `/developers` + sitemap + footer + llms.txt (Task 12), reserved-path regression (Task 13), rollout order (Tasks 1→14). Notice-field single source: Task 3 (`USERNAME_LINK_NOTICE`).
- **Type consistency:** `ApiErrorDetail` (Task 2) consumed in Tasks 9-10; `MinimalLimiter`/`checkRateLimit(request, kind, limiter?)` signature consistent across Tasks 4 and 7-10; `generateQr(QrOptions) → QrOutput` consistent between Tasks 6 and 10; `buildShortLink` between Tasks 5 and 7.
- **Known risk:** `QRCode.toBuffer` types come from `@types/qrcode` — if the overload complains about `type: "png"`, drop the `type` field (PNG is the default for `toBuffer`).
