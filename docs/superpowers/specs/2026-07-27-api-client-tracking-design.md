# Design Spec: New vs Returning API Clients Tracking & Analytics

## 1. Overview

This document specifies the technical design for tracking "New vs Returning API Clients" on **WhatsUsernames.link** without altering existing public API response contracts, HTTP status codes, or breaking statelessness for end users. 

Tracking relies on anonymous client identification via salted SHA-256 hashes stored in Upstash Redis, with zero plain-text IP retention.

## 2. Anonymous Identification Protocol

Each incoming API request (`/api/v1/*`) extracts the client's identity:

1. **IP Resolution**:
   - Check headers in order: `CF-Connecting-IP`, `X-Forwarded-For` (first IP in CSV list), `X-Real-IP`.
   - Fallback to `"127.0.0.1"` if unavailable.
2. **User-Agent Resolution**:
   - `User-Agent` header value or `"unknown-agent"`.
3. **Hashing**:
   - Secret Salt: `process.env.CLIENT_ID_SALT` (with fallback `"whatsusernames-default-secret-salt-2026"`).
   - Algorithm: SHA-256 hex string over `${ip}:${userAgent}:${salt}`.
   - Output: `client_id` (64-character hex string).
   - **Privacy Guarantee**: The raw IP address is NEVER logged or saved in Redis/database.

## 3. Redis Data Structures & Pipeline Architecture

The Redis instance at `lib/redis.ts` is updated using atomic Pipeline execution (`redis.pipeline()`):

### Keys
1. **Client Profile**: `HSET stats:client:{client_id}`
   - `first_seen`: ISO 8601 string (e.g. `2026-07-27T23:40:00.000Z`) set ONLY if not existing (`HSETNX`).
   - `last_seen`: ISO 8601 string set on every request (`HSET`).
   - `total_requests`: Counter incremented on every request (`HINCRBY 1`).
2. **Global Unique Clients**: `SADD stats:clients:all {client_id}`
3. **Daily Active Clients**: `SADD stats:daily:{YYYY-MM-DD}:active_clients {client_id}`
4. **Daily New Clients**: `SADD stats:daily:{YYYY-MM-DD}:new_clients {client_id}` (if `first_seen` date matches today).

### Metrics Calculation Logic
For a given day `YYYY-MM-DD`:
- **New API Clients Today**: `SCARD stats:daily:{today}:new_clients`
- **Active Clients Today**: `SCARD stats:daily:{today}:active_clients`
- **Returning API Clients Today**: `max(0, active_clients_today - new_clients_today)`
- **Total Unique API Clients**: `SCARD stats:clients:all`
- **Requests Today**: `GET stats:daily:{today}:api`

## 4. API & Interface Contracts

### Internal API (`/api/stats`)
Extended response payload for `DashboardStats`:
```ts
export interface DashboardStats {
  totalLinks: number;
  webLinks: number;
  apiLinks: number;
  totalApiCalls: number;
  todayLinks: number;
  todayApiCalls: number;
  // New API Client Metrics
  totalUniqueClients: number;
  todayNewClients: number;
  todayReturningClients: number;
  endpointBreakdown: Record<string, number>;
  dailyHistory: Array<{
    date: string;
    links: number;
    apiCalls: number;
    newClients: number;
    returningClients: number;
  }>;
  lastUpdated: string;
}
```

### Public API (`/api/v1/*`)
- **Zero changes** to request/response contracts, headers, or status codes.
- `recordApiCall(endpoint, request)` is invoked asynchronously without blocking the response stream.

## 5. UI/UX Dashboard Additions

In `components/dashboard/dashboard-view.tsx`:
1. **New Metric Cards**:
   - `New API Clients Today`
   - `Returning API Clients Today`
   - `Total Unique API Clients`
2. **Visual Chart / Table**:
   - Updated `7-Day Recent Activity` table including `Novos Clientes` e `Clientes Recorrentes`.
   - Visual stacked bar indicator for daily client distribution.

## 6. Testing & Verification Strategy

1. **Unit Tests** (`lib/stats.test.ts` & `lib/client-id.test.ts`):
   - Test anonymous `client_id` hash generation (consistent hash for same IP+UA, different for different IP/UA).
   - Test `first_seen`, `last_seen`, and daily new vs returning calculation logic.
   - Verify zero IP leakage in Redis payloads.
2. **Integration Tests** (`app/api/v1/phone-link/route.test.ts` etc.):
   - Verify public API endpoints return identical 200/400 responses with tracking enabled.
3. **Build & Type Check**:
   - `pnpm test` passed 100%.
   - `pnpm build` clean compilation.
