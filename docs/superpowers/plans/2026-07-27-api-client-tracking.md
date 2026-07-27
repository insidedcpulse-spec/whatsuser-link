# New vs Returning API Clients Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement anonymous, persistent tracking of New vs Returning API Clients in WhatsUsernames.link using SHA-256 client hashing and Upstash Redis sets/hashes, displaying real-time metrics and historical charts on the Dashboard while keeping public API responses 100% unchanged.

**Architecture:** Create an anonymous client identification module (`lib/client-id.ts`) that computes an irreversible SHA-256 hash from IP, User-Agent, and a secret salt. Update `lib/stats.ts` to record client activity in Upstash Redis via atomic pipelines (`HSET` profile, `SADD` global/daily sets). Expose the aggregated metrics on `/api/stats` and render them on `DashboardView`.

**Tech Stack:** Next.js 15, TypeScript, Upstash Redis, Vitest, Lucide React, Tailwind CSS.

---

### Task 1: Anonymous Client ID Generator Module

**Files:**
- Create: `lib/client-id.ts`
- Test: `lib/client-id.test.ts`

- [ ] **Step 1: Write the failing unit tests for client ID generation**

Create `lib/client-id.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { getClientId } from "./client-id";

describe("getClientId", () => {
  it("generates a consistent 64-char hex SHA-256 hash for identical IP and User-Agent", () => {
    const req1 = new Request("https://whatsusernames.link/api/v1/phone-link", {
      headers: {
        "x-forwarded-for": "198.51.100.1",
        "user-agent": "TestClient/1.0",
      },
    });

    const req2 = new Request("https://whatsusernames.link/api/v1/username-link", {
      headers: {
        "x-forwarded-for": "198.51.100.1",
        "user-agent": "TestClient/1.0",
      },
    });

    const id1 = getClientId(req1);
    const id2 = getClientId(req2);

    expect(id1).toHaveLength(64);
    expect(id1).toBe(id2);
  });

  it("generates different hashes for different IP addresses or User-Agents", () => {
    const req1 = new Request("https://whatsusernames.link/api/v1/phone-link", {
      headers: {
        "x-forwarded-for": "198.51.100.1",
        "user-agent": "TestClient/1.0",
      },
    });

    const req2 = new Request("https://whatsusernames.link/api/v1/phone-link", {
      headers: {
        "x-forwarded-for": "198.51.100.2",
        "user-agent": "TestClient/1.0",
      },
    });

    expect(getClientId(req1)).not.toBe(getClientId(req2));
  });

  it("prioritizes CF-Connecting-IP over X-Forwarded-For", () => {
    const req = new Request("https://whatsusernames.link/api/v1/qr", {
      headers: {
        "cf-connecting-ip": "203.0.113.5",
        "x-forwarded-for": "198.51.100.1",
        "user-agent": "TestClient/1.0",
      },
    });

    const reqCfOnly = new Request("https://whatsusernames.link/api/v1/qr", {
      headers: {
        "cf-connecting-ip": "203.0.113.5",
        "user-agent": "TestClient/1.0",
      },
    });

    expect(getClientId(req)).toBe(getClientId(reqCfOnly));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test lib/client-id.test.ts`
Expected: FAIL with "Cannot find module './client-id'"

- [ ] **Step 3: Implement `lib/client-id.ts`**

Create `lib/client-id.ts`:
```ts
import { createHash } from "crypto";

export function extractClientIp(request: Request): string {
  const cfIp = request.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp.trim();

  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const firstIp = xff.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }

  const xRealIp = request.headers.get("x-real-ip");
  if (xRealIp) return xRealIp.trim();

  return "127.0.0.1";
}

export function getClientId(request: Request): string {
  const ip = extractClientIp(request);
  const userAgent = request.headers.get("user-agent") || "unknown-agent";
  const salt = process.env.CLIENT_ID_SALT || "whatsusernames-default-secret-salt-2026";

  return createHash("sha256")
    .update(`${ip}:${userAgent}:${salt}`)
    .digest("hex");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test lib/client-id.test.ts`
Expected: PASS (3 tests passed)

- [ ] **Step 5: Commit Task 1**

```bash
git add lib/client-id.ts lib/client-id.test.ts
git commit -m "feat(analytics): add anonymous client ID SHA-256 hash generator"
```

---

### Task 2: Redis Client Tracking Persistence & Stats Upgrade

**Files:**
- Modify: `lib/stats.ts`
- Modify: `lib/stats.test.ts`

- [ ] **Step 1: Update DashboardStats interface and write failing test in `lib/stats.test.ts`**

Update `lib/stats.test.ts` to include tests for client tracking metrics:
```ts
import { describe, expect, it, vi, beforeEach } from "vitest";
import { recordApiCall, getDashboardStats } from "./stats";

describe("stats service with client tracking", () => {
  it("tracks new vs returning clients correctly in stats", async () => {
    const reqNewClient = new Request("https://whatsusernames.link/api/v1/phone-link", {
      headers: { "x-forwarded-for": "198.51.100.50", "user-agent": "ClientA" },
    });

    await recordApiCall("/api/v1/phone-link", reqNewClient);

    const stats = await getDashboardStats();
    expect(stats).toHaveProperty("totalUniqueClients");
    expect(stats).toHaveProperty("todayNewClients");
    expect(stats).toHaveProperty("todayReturningClients");
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `pnpm test lib/stats.test.ts`
Expected: FAIL due to missing client tracking properties or function signature updates

- [ ] **Step 3: Update `lib/stats.ts` to process and return client metrics**

Update `lib/stats.ts`:
- Extend `DashboardStats` interface with `totalUniqueClients`, `todayNewClients`, `todayReturningClients`, and update `dailyHistory` with `newClients` and `returningClients`.
- Update `recordApiCall(endpoint: string, request?: Request): Promise<void>`.
- When `request` is provided, compute `clientId = getClientId(request)`.
- Use Upstash pipeline to:
  - Check if `first_seen` exists in `stats:client:${clientId}`.
  - If new, `HSETNX stats:client:${clientId} first_seen ${nowIso}`, and `SADD stats:daily:${today}:new_clients ${clientId}`.
  - `HSET stats:client:${clientId} last_seen ${nowIso}`, `HINCRBY stats:client:${clientId} total_requests 1`.
  - `SADD stats:clients:all ${clientId}`.
  - `SADD stats:daily:${today}:active_clients ${clientId}`.
- Update `getDashboardStats()` pipeline to fetch:
  - `SCARD stats:clients:all`
  - `SCARD stats:daily:${today}:new_clients`
  - `SCARD stats:daily:${today}:active_clients`
  - Daily history `SCARD stats:daily:${date}:new_clients` and `SCARD stats:daily:${date}:active_clients`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test lib/stats.test.ts`
Expected: PASS (all tests passing)

- [ ] **Step 5: Commit Task 2**

```bash
git add lib/stats.ts lib/stats.test.ts
git commit -m "feat(analytics): implement Redis client tracking pipeline in stats service"
```

---

### Task 3: API Route Integration

**Files:**
- Modify: `app/api/v1/phone-link/route.ts`
- Modify: `app/api/v1/username-link/route.ts`
- Modify: `app/api/v1/qr/route.ts`
- Modify: `app/api/v1/business/bsuid/parse/route.ts`
- Modify: `app/api/v1/business/bsuid/validate/route.ts`
- Modify: `app/api/v1/business/contact/resolve/route.ts`
- Modify: `app/api/v1/business/username/validate/route.ts`
- Modify: `app/api/v1/business/webhook/normalize/route.ts`

- [ ] **Step 1: Pass `request` object to `recordApiCall` across API routes**

Update all API v1 endpoints to pass `request` to `recordApiCall(endpoint, request)`.
Verify public API response headers, HTTP codes, and JSON bodies remain 100% unchanged.

- [ ] **Step 2: Run all vitest suite**

Run: `pnpm test`
Expected: PASS (183+ tests passing clean)

- [ ] **Step 3: Commit Task 3**

```bash
git add app/api/v1/
git commit -m "feat(api): connect client tracking in API v1 routes"
```

---

### Task 4: Dashboard UI & i18n Translation Updates

**Files:**
- Modify: `messages/pt.json`, `messages/en.json`, `messages/es.json`
- Modify: `components/dashboard/dashboard-view.tsx`

- [ ] **Step 1: Add i18n translation keys for Client Tracking**

In `messages/pt.json`, `messages/en.json`, `messages/es.json` under `"dashboard"`:
Add:
- `"newClients": "New API Clients Today" / "Novos Clientes Hoje" / "Nuevos Clientes Hoy"`
- `"returningClients": "Returning API Clients Today" / "Clientes Recorrentes Hoje" / "Clientes Recurrentes Hoy"`
- `"totalUniqueClients": "Total Unique API Clients" / "Total de Clientes Únicos" / "Total de Clientes Únicos"`

- [ ] **Step 2: Update `DashboardView` component to render Client Metrics & Chart**

Update `components/dashboard/dashboard-view.tsx`:
- Render 3 new metric cards for `New API Clients Today`, `Returning API Clients Today`, and `Total Unique API Clients`.
- Add `Novos Clientes` and `Clientes Recorrentes` columns/bars to the 7-day activity section.

- [ ] **Step 3: Run unit tests and static build check**

Run: `pnpm test && pnpm build`
Expected: All tests pass, Next.js build compiles clean.

- [ ] **Step 4: Commit Task 4**

```bash
git add messages/ components/dashboard/dashboard-view.tsx
git commit -m "feat(dashboard): display New vs Returning API Clients metrics and activity chart"
```
