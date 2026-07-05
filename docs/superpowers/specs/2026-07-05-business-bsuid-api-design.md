# Business Platform — Usernames + BSUID API (Fase 2) — Design

**Date:** 2026-07-05
**Status:** Approved by user (brainstorming session)
**Research:** [docs/research/2026-07-05-bsuid-usernames-research.md](../research/2026-07-05-bsuid-usernames-research.md)

## Goal

Extend the existing public API v1 with a new, independent section covering WhatsApp **Business Platform / Cloud API** concepts: Business-Scoped User IDs (BSUID) and Business Usernames. This is a distinct feature from the existing consumer wa.me username feature (`lib/whatsapp/generateLink.ts`) — same underlying Meta concept (a username), but exposed through a completely different API surface (Cloud API webhooks/responses vs. a public wa.me link), with different validation rules and no official doc unifying the two. See research report §1 and §13.3.

Scope for this phase: **validate, normalize, parse — no real Meta lookups, no sending messages.** The mission's Fase 2 explicitly excludes sending messages via BSUID/username as `to` (undocumented for send at time of research; see research §9, §13.4).

## Non-goals (this phase)

- No database, no persistence, no state. Every endpoint is a pure function of its input.
- No real contact lookup against Meta's Graph API — `contact/resolve` only normalizes/echoes the identifier given, it does not call Meta.
- No sending messages (`to` field with BSUID/username) — undocumented for send, deferred to a future phase per user decision.
- No webhook *receiver* (no verify-token/challenge subscription flow) — `webhook/normalize` is a utility endpoint the caller POSTs a raw payload to, not a registered Meta webhook subscriber.
- No changes to `lib/whatsapp/generateLink.ts` or any consumer wa.me code — kept fully separate per user decision (research §13.3).
- No multi-provider plugin/registry system yet — only a clean adapter seam (single `metaCloudApiAdapter` implementation) so a second provider can be added later without touching the public interface. Building a full plugin loader now would be premature (only one provider exists today).

## Architecture

New namespace `app/api/v1/business/*`, reusing 100% of the existing v1 API infrastructure:

- `lib/api/responses.ts` — same JSON/CORS/cache/error envelope as existing endpoints.
- `lib/api/error-codes.ts` — extended with new codes (see Error handling).
- `lib/api/rate-limit.ts` — same Upstash fail-open rate limiter, applied identically.
- `lib/api/openapi.ts` — extended so new routes appear in the auto-generated OpenAPI 3.1 spec at `/api/v1/openapi.json`.

New business logic lives in `lib/business/` (parallel to, but independent from, `lib/whatsapp/`):

```
lib/business/
  bsuid/
    validate.ts
    parse.ts
  username/
    validate.ts
  contact/
    resolve.ts
  webhook/
    normalize.ts
    adapters/
      meta-cloud-api.ts   — the only adapter implementation for now
    types.ts              — NormalizedEvent, WebhookAdapter interface
```

Route handlers stay thin (parse/validate request, call `lib/business/*`, wrap via `lib/api/responses.ts`) — same pattern as existing `app/api/v1/*` routes.

### New files

```
app/api/v1/business/bsuid/validate/route.ts
app/api/v1/business/bsuid/parse/route.ts
app/api/v1/business/username/validate/route.ts
app/api/v1/business/contact/resolve/route.ts
app/api/v1/business/webhook/normalize/route.ts
lib/business/bsuid/validate.ts (+ .test.ts)
lib/business/bsuid/parse.ts (+ .test.ts)
lib/business/username/validate.ts (+ .test.ts)
lib/business/contact/resolve.ts (+ .test.ts)
lib/business/webhook/normalize.ts (+ .test.ts)
lib/business/webhook/adapters/meta-cloud-api.ts
lib/business/webhook/types.ts
```

No new dependencies required — all validation is regex/plain-object logic.

## Endpoints

All under `/api/v1/business/`, all POST (unlike the existing GET-only v1 endpoints — these take structured/variable-shape bodies, particularly the webhook payload, which doesn't fit query params).

### `POST /api/v1/business/bsuid/validate`

Format per research §2: `CC.alfanum(1-128)` or parent variant `CC.ENT.alfanum(1-128)`. Regex: `^[A-Z]{2}\.(ENT\.)?[A-Za-z0-9]{1,128}$`.

```json
// in
{ "bsuid": "US.13491208655302741918" }
// out 200
{ "valid": true, "isParent": false }
```

### `POST /api/v1/business/bsuid/parse`

```json
// in
{ "bsuid": "US.ENT.11815799212886844830" }
// out 200
{ "countryCode": "US", "id": "11815799212886844830", "isParent": true }
// out 400 (invalid) — error code INVALID_BSUID
```

### `POST /api/v1/business/username/validate`

Rules per research §"Charset username de negócio" (official, confirmed): `a-z0-9._`, 3-35 chars, ≥1 letter, no leading/trailing dot, no consecutive dots, no leading `www`, no trailing known domain suffix (`.com`, `.org`, `.net`, `.int`, `.edu`, `.gov`, `.mil`, `.us`, `.in`, `.html`, ...). Case-insensitive but `.`/`_` are distinct characters (not folded).

```json
// in
{ "username": "my..id" }
// out 200
{ "valid": false, "reasons": ["consecutive_dots"] }
```

Possible `reasons` values: `too_short`, `too_long`, `no_letter`, `leading_or_trailing_dot`, `consecutive_dots`, `leading_www`, `reserved_domain_suffix`, `invalid_character`.

### `POST /api/v1/business/contact/resolve`

Exactly one of `bsuid`, `phone`, `username` required. No real Meta lookup — normalizes/echoes the given identifier only; every other field is `null`. This is documented explicitly in the OpenAPI description to avoid implying a real directory lookup.

```json
// in
{ "username": "joao.silva" }
// out 200
{
  "id": "joao.silva",
  "type": "username",
  "username": "joao.silva",
  "phone": null,
  "bsuid": null,
  "displayName": null,
  "phoneKnown": false,
  "bsuidKnown": false
}
```

`type` = which identifier the caller supplied (`"bsuid" | "phone" | "username"`) — not a Meta-derived classification (research confirms no reliable way to classify consumer-vs-business from input alone).

Errors: `MISSING_IDENTIFIER` (400) if zero or more than one of the three fields is present.

### `POST /api/v1/business/webhook/normalize`

Accepts a raw Cloud API webhook payload, returns a stable normalized shape — isolating the caller from the "with/without `wa_id`", "with/without `username`" variance documented in research §4/§7.

```json
// out 200
{
  "provider": "meta_cloud_api",
  "events": [
    {
      "kind": "message",
      "bsuid": "US.13491208655302741918",
      "phone": "16505551234",
      "username": "username",
      "displayName": "User Name",
      "raw": { /* original item */ }
    }
  ]
}
```

`NormalizedEvent.kind` is `"message" | "status"`. `phone`/`username`/`displayName` are `null` when Meta omits them (outside the 30-day window, no username set, etc. — research §4/§7). Unrecognized payload shape → `WEBHOOK_UNRECOGNIZED_SHAPE` (422). Malformed JSON body → `WEBHOOK_INVALID_JSON` (400).

Adapter seam: `normalize()` delegates to `WebhookAdapter.normalize(raw)`; today the only registered adapter is `metaCloudApiAdapter`. No adapter registry/config yet — adding a second provider later means adding a second adapter module and a dispatch branch, without changing the public endpoint contract.

## Error handling

Reuses the existing error envelope (`lib/api/responses.ts`) — no new response shape. New codes added to `lib/api/error-codes.ts`:

| Code | HTTP | When |
|---|---|---|
| `INVALID_BSUID` | 400 | bsuid fails format regex |
| `INVALID_USERNAME` | 400 | username fails charset/structural rules |
| `MISSING_IDENTIFIER` | 400 | contact/resolve given 0 or 2+ identifiers |
| `WEBHOOK_UNRECOGNIZED_SHAPE` | 422 | payload doesn't match any known Meta webhook shape |
| `WEBHOOK_INVALID_JSON` | 400 | request body isn't valid JSON |

Rate limiting: identical Upstash fail-open policy as existing endpoints, applied to all five new routes via the same shared helper — no new policy invented.

## Testing (vitest, existing repo pattern)

- `lib/business/bsuid/validate.test.ts` — valid plain, valid parent (`.ENT.`), invalid: lowercase country code, >128 chars, missing dot, non-alphanumeric char.
- `lib/business/username/validate.test.ts` — cases taken directly from the official doc: `myID`≡`myid` valid, `my.id`/`my_id` distinct valid, `..` invalid, leading/trailing `.` invalid, leading `www` invalid, trailing `.com` invalid, non-English chars (`é`, `ñ`) invalid, <3 or >35 chars invalid, digits-only (no letter) invalid.
- `lib/business/webhook/normalize.test.ts` — 3 fixtures from the research report: classic payload (no username), payload with username inside the 30-day window, payload with `wa_id` omitted (outside window). Each asserts correct `NormalizedEvent[]`. Plus one malformed-shape fixture → `WEBHOOK_UNRECOGNIZED_SHAPE`.
- `lib/business/contact/resolve.test.ts` — one case per identifier (bsuid/phone/username), zero-fields error case, two-plus-fields error case.
- `app/api/v1/business/**/route.test.ts` — one per route, following `validate-routes.test.ts` as reference: HTTP status, envelope shape, CORS headers, rate-limit header present.
- `lib/api/openapi.test.ts` (existing) — extended to assert the five new routes appear in the generated spec.

Target: 100% coverage on `lib/business/*` (pure, critical logic); routes covered via request/response assertions; nothing to mock (no external calls in this phase).

## Open items deferred to future phases (not blocking this design)

- Relationship between consumer wa.me username and business username — same underlying identity, different surfaces; no official doc unifies them (research §1, §13.3). Revisit if a unification opportunity becomes officially documented.
- `parentBsuid` naming seen only in third-party (tyntec) docs, not Meta directly — confirm before adopting in SDK (Fase 3) naming.
- Sending messages using BSUID/username as `to` — became available (per official doc) starting July 2026, which may already be active at time of research (2026-07-05). Out of scope for this phase per user decision; revisit for a future "send" phase.
- Multi-provider webhook support (Twilio, Infobip, etc.) — adapter seam exists, no second implementation yet (YAGNI until a second provider is actually needed).
