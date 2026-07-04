# Public API v1 — Design

**Date:** 2026-07-04
**Status:** Approved by user (brainstorming session)

## Goal

Free public REST API exposing everything the site currently offers, so developers and integrators can generate WhatsApp links programmatically. No API key, no signup. Secondary goals: SEO/GEO surface area ("whatsapp link api" queries, llms.txt discovery by AI assistants) and organic backlinks from tutorials — the same freemium-adoption lever the Walink competitor uses.

## Non-goals (v1)

- No API keys, accounts, dashboards, or paid tiers.
- No QR logo overlay via API (server-side compositing needs canvas/sharp; deferred).
- No QR for arbitrary content — QR endpoint only encodes wa.me links built from validated `username`/`phone` params. An open QR generator is a free phishing tool; this restriction eliminates that abuse class.
- No POST endpoints. Everything is GET (curl-friendly, CDN-cacheable — all responses are deterministic functions of their query params).

## Architecture

Route Handlers inside the existing Next.js project (`app/api/v1/*/route.ts`), same Vercel deployment, same domain (`https://whatsusernames.link/api/v1/...`). Handlers are thin: parse/validate query params, call the existing `services/` and `utils/validate-*` functions, wrap in shared response helpers. Zero duplicated business logic — `lib/whatsapp/generateLink.ts` stays the single place that knows the wa.me URL format.

Chosen over (B) a separate `api.` subdomain project (isolation not worth a second project + shared-package extraction at this scale) and (C) bare GET endpoints without real rate limiting (CDN cache alone doesn't bound abuse of unique-param requests).

### New files

```
app/api/v1/username-link/route.ts
app/api/v1/phone-link/route.ts
app/api/v1/validate/username/route.ts
app/api/v1/validate/key/route.ts
app/api/v1/validate/phone/route.ts
app/api/v1/qr/route.ts
app/api/v1/openapi.json/route.ts
lib/api/responses.ts      — JSON/CORS/cache/error helpers
lib/api/rate-limit.ts     — Upstash wrapper, fail-open
lib/api/error-codes.ts    — i18n-key → stable API error code mapping
lib/api/openapi.ts        — OpenAPI 3.1 spec as a typed TS object
lib/qr/generate-qr.ts     — server-side QR (npm `qrcode`)
app/[locale]/developers/page.tsx  (+ i18n namespace `developers`)
```

### New dependencies

`qrcode` (+ `@types/qrcode`), `@upstash/ratelimit`, `@upstash/redis`.

## Endpoints

All under `/api/v1/`, all GET, JSON unless noted.

### `GET /api/v1/username-link`

Params: `username` (required), `key` (optional, WhatsApp Username Key), `text` (optional prefilled message).

200 response:

```json
{
  "username": "joao.silva",
  "key": "AB12",
  "link": "https://wa.me/joao.silva?text=...",
  "shortLink": "https://whatsusernames.link/joao.silva",
  "notice": "As of 2026-07-04, wa.me username links do not yet resolve for all accounts. Verify before relying on them. See https://whatsusernames.link/llms.txt"
}
```

`key` and `text` echoed/omitted when absent. `notice` is a static string maintained in one place (`lib/api/responses.ts`) and must be updated in the same pass as `app/llms.txt/route.ts` when the wa.me/username status flips (grep "2026-07" to find both).

### `GET /api/v1/phone-link`

Params: `phone` (required — full international number, digits with optional leading `+`, dial code included), `text` (optional).

200 response: `{ "phone": "351912345678", "link": "https://wa.me/351912345678?text=..." }`

Input is passed through `sanitizePhoneInput` before `validatePhoneNumber` — same pipeline as the UI. Note `sanitizePhoneInput` strips a leading `0` (trunk prefix); leading `+` is removed by its digits-only filter.

### `GET /api/v1/validate/username`, `/validate/key`, `/validate/phone`

Param: `username` / `key` / `phone` respectively.

200 response (always 200 for a well-formed request, even when the value is invalid — validity is the payload, not an error):

```json
{ "valid": false, "errors": [{ "code": "username_too_short", "message": "Username must be 3-35 characters." }] }
```

### `GET /api/v1/qr`

Params: exactly one of `username` or `phone` (required), plus `text` (optional), `format` (`png` | `svg`, default `png`), `size` (px, 128–1024, default 512, PNG only), `color` (hex without `#`, default `000000`), `bg` (hex or `transparent`, default `ffffff`).

Response: raw image (`image/png` or `image/svg+xml`), not JSON. The encoded content is the wa.me link produced by the same service functions as the link endpoints. Invalid params → JSON error (400) like every other endpoint.

### `GET /api/v1/openapi.json`

Serves the OpenAPI 3.1 document built from `lib/api/openapi.ts`. Spec examples use real-looking values and include the rate-limit documentation.

## Common behavior

**Errors.** Non-200 responses are always:

```json
{ "error": { "code": "invalid_username", "message": "Username must be 3-35 characters." } }
```

400 for bad input, 429 for rate limit, 500 for unexpected failures. Existing validators return i18n keys (`errors.length`, `keyErrors.invalidFormat`, `phoneErrors.invalidFormat`); `lib/api/error-codes.ts` maps each key to a stable snake_case API code + English message. API messages are English-only (JSON responses are for machines; the trilingual surface is `/developers`).

**CORS.** `Access-Control-Allow-Origin: *` on every response, plus an `OPTIONS` handler per route (shared helper). The API is meant to be called from browsers.

**Caching.** `Cache-Control: public, s-maxage=86400, stale-while-revalidate=604800` on all 200s (responses are deterministic). Vercel CDN absorbs repeated requests before they reach functions — cached hits also never touch the rate limiter. Error responses: `no-store`.

**Versioning.** Breaking response-shape changes require `/api/v2/`; v1 shape is frozen once shipped.

**Reserved-path interaction.** `/api/*` is already excluded from the username short-link redirect (`app/[locale]/[username]/route.ts` validates locale first — bug fixed in `6138e84`); no middleware changes expected, but the implementation plan must include a regression test that `/api/v1/...` never 307s to wa.me.

## Rate limiting

- `@upstash/ratelimit` sliding window over Upstash Redis (Vercel Marketplace integration, free tier, env vars auto-provisioned).
- Per-IP (from `x-forwarded-for` first hop): **60 req/min** for JSON endpoints, **20 req/min** for `/qr`.
- Response headers on every rate-limited route: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`. 429 includes `Retry-After`.
- **Fail-open:** Redis unreachable/timeout (250 ms budget) → request proceeds, `console.warn` logged. Availability over strictness; Vercel spend caps are the backstop.
- The Upstash instance stores only transient per-IP counters — no user data. The product's stateless-core principle (no user data at rest) is preserved.

## `/developers` page (EN/PT/ES)

- New route `app/[locale]/developers/page.tsx`, i18n namespace `developers`, all three locales at launch per the project's trilingual rule.
- Content: intro, endpoint reference table, curl + JS `fetch` examples per endpoint, rate-limit section, error-format section, link to `/api/v1/openapi.json`, the wa.me/username status notice.
- SEO: `generateMetadata` with hreflang (same pattern as blog), sitemap entries for all three locales, footer link "API" in the three languages.
- GEO: new API section in `app/llms.txt/route.ts` (endpoint list + openapi.json URL) so AI assistants can discover and describe the API.

## Testing

- Vitest, `node` env (matches existing setup — no jsdom needed):
  - param parsing + error mapping per endpoint (invoke route handlers directly with `new Request(...)`),
  - error-code mapping table is exhaustive over all validator i18n keys,
  - QR: SVG output contains expected structure; PNG returns correct content-type and non-empty body,
  - rate-limit wrapper with mocked Redis: allows under limit, 429 over limit, fail-open on thrown error,
  - regression: `/api/v1/foo` is never redirected by the `[username]` route.
- Post-deploy smoke: curl every endpoint on production, verify status codes, CORS header, cache header, one 429 by looping.

## Rollout order

1. Upstash Marketplace setup (env vars in Vercel + `.env.local` via `vercel env pull`).
2. Library code (`lib/api/*`, `lib/qr/*`) with tests.
3. Route handlers with tests.
4. OpenAPI spec.
5. `/developers` page + i18n + footer + sitemap + llms.txt.
6. Deploy, smoke test, GSC/IndexNow ping for `/developers`.
