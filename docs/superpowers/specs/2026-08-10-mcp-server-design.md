# MCP Server v0 — Design

**Date:** 2026-08-10
**Status:** Approved by user (brainstorming session)

## Goal

Expose a slice of the existing public API v1 as an MCP (Model Context Protocol) server, so AI agents (Claude and other MCP clients) can validate WhatsApp usernames/phone numbers and generate wa.me links/QR codes directly, without a human hitting the REST API manually. Secondary goal: GEO/discovery surface — being an early, documented MCP endpoint for WhatsApp link tooling is a cheap differentiation and citation signal for AI assistants, consistent with the site's existing GEO push (`public/llms.txt`).

## Context

The REST API (`app/api/v1/*`, see `2026-07-04-public-api-design.md`) is free, public, no API key — rate-limited by IP only (`lib/api/rate-limit.ts`: 60 req/min for JSON endpoints, 20 req/min for QR, via Upstash Redis sliding window). There is no user-account or API-key system anywhere in the project (only a single admin password session for the internal dashboard). The site itself is early-stage — AdSense approval is still pending resubmission as of this writing.

Given that, this design deliberately scopes down to a v0 that adds **no new auth infrastructure**. It reuses the REST API's existing open, rate-limited model. A full API-key/billing system is treated as a separate, future project, only worth building if this v0 shows real usage.

## Non-goals (v0)

- No API keys, accounts, dashboards, or paid tiers. MCP inherits the same open, IP-rate-limited model as the REST API.
- No `validate_key` tool (WhatsApp username-key format check) or any `business/*` tools (`bsuid` parse/validate, `contact/resolve`, `webhook/normalize`) — more niche/B2B surface, add later if there's demand.
- No local/stdio distribution (e.g. an installable `whatsusernames-mcp` npm package). Remote HTTP only.
- No MCP resources or prompts — tools only.
- No stateful MCP sessions. Streamable HTTP transport runs stateless, matching Vercel's serverless request model.
- No dedicated `/docs/mcp` page. Discovery is via `llms.txt` + README section only.

## Architecture

New Route Handler `app/api/mcp/route.ts` inside the existing Next.js project, same deployment/domain as the REST API (`https://whatsusernames.link/api/mcp`). Implements the MCP Streamable HTTP transport using the official `@modelcontextprotocol/sdk` (currently a transitive dependency via `shadcn`; promoted to a direct `dependencies` entry).

Each incoming HTTP POST instantiates a fresh `McpServer` + `StreamableHTTPServerTransport` in stateless mode (no `sessionIdGenerator`), handles the one JSON-RPC request, and discards the server instance — mirroring how the existing REST routes are stateless functions of their query params.

Tool handlers call the same `services/` and `utils/validate-*` functions the REST routes call — no self-HTTP round-trip, no duplicated business logic. This matches the precedent set in the public API design (`lib/whatsapp/generateLink.ts` etc. stay the single source of truth).

Rate limiting reuses `checkRateLimit(request, kind)` from `lib/api/rate-limit.ts`, applied once per HTTP request at the top of the route handler, keyed the same way (by IP) as the REST endpoints:
- `tools/call` for `validate_username`, `validate_phone`, `username_link`, `phone_link` → `"json"` limiter (60/min)
- `tools/call` for `qr_code` → `"qr"` limiter (20/min)
- `tools/list` and `initialize` → `"json"` limiter

### New files

```
app/api/mcp/route.ts
app/api/mcp/tools/validate-username.ts
app/api/mcp/tools/validate-phone.ts
app/api/mcp/tools/username-link.ts
app/api/mcp/tools/phone-link.ts
app/api/mcp/tools/qr-code.ts
app/api/mcp/route.test.ts
```

Each `tools/*.ts` file exports a plain function (params in, MCP `CallToolResult`-shaped object out) so it can be unit-tested the same way the existing `route.test.ts` files test their route handlers, independent of the MCP transport plumbing.

## Tools

| Tool | Wraps | Params | Notes |
|---|---|---|---|
| `validate_username` | `utils/validate-username` | `username` | Same validation as `GET /api/v1/validate/username` |
| `validate_phone` | `utils/validate-phone` | `phone` | Same validation as `GET /api/v1/validate/phone` |
| `username_link` | `services/link-service` | `username`, `key?`, `text?` | Returns `link`, `shortLink`, `notice` (same `USERNAME_LINK_NOTICE` as REST) |
| `phone_link` | `services/phone-link-service` | `phone`, `text?` | Mirrors `phone-link` REST route |
| `qr_code` | `lib/qr/generate-qr` | `username?` or `phone?` (exactly one), `text?`, `format?` (`png`\|`svg`, default `png`), `size?` (128–1024, default 512), `color?`, `bg?` | `format=png` → MCP image content block (base64 + `image/png`); `format=svg` → MCP text content block with raw SVG markup |

Tool input schemas are defined with `zod`, matching validation already present in the REST routes (hex color regex, size bounds, XOR of `username`/`phone`, etc.) so behavior is identical between REST and MCP for the same logical request.

## Error handling

Each tool handler returns `{ isError: true, content: [...] }` on failure rather than throwing, with a structured payload mirroring the REST error shape (`lib/api/error-codes.ts` → `mapValidationError`, `lib/api/responses.ts` → `apiError`):

```json
{ "code": "invalid_username", "message": "..." }
```

Cases handled:
- Missing/invalid params → same `code`/`message` pairs as the equivalent REST 400 responses.
- Rate limit exceeded → `{ code: "rate_limited", message: "Too many requests, slow down." }`, `isError: true`. This does not fail the MCP transport/JSON-RPC envelope — only the individual tool call reports the error, so the client can retry later.
- Unexpected exceptions → `{ code: "internal_error", message: "Unexpected error." }`, logged server-side via `console.error("[mcp] <tool> failed:", error)`, matching the existing REST route pattern.

## Testing

- **Unit tests** (one file per tool, or grouped in `route.test.ts` following the existing convention): valid input → expected result; missing required param → `invalid`/`missing_*` error; invalid format → validation error; rate limit hit → `rate_limited` error. Reuses the same fixture/mocking patterns as `app/api/v1/*/route.test.ts` (e.g. injecting a fake `MinimalLimiter`).
- **Integration test** (`app/api/mcp/route.test.ts`): raw JSON-RPC POST to the route — `initialize` → `tools/list` (asserts exactly the 5 tools above, with their schemas) → `tools/call` for `validate_username` end-to-end, asserting the full HTTP response shape the Streamable HTTP transport produces.

## Discovery

- Add an entry to `public/llms.txt` (or wherever `app/llms.txt/route.ts` sources its content) describing the MCP endpoint URL and what it does, consistent with how the REST API is already surfaced there.
- Add a "Connect via MCP" section to the README with a minimal client config example:

```json
{
  "mcpServers": {
    "whatsusernames": {
      "url": "https://whatsusernames.link/api/mcp"
    }
  }
}
```

## Future work (explicitly deferred)

- API key / account system, if v0 usage justifies it — separate design, separate spec.
- `business/*` tools once there's a concrete B2B/agent use case.
- Local/stdio distribution package if remote-only proves insufficient for some clients.
- Usage/quota tracking per caller (currently only IP-based rate limiting, no identity).
