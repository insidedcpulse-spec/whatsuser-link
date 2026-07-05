# WhatsUsernames.link

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

Open source toolkit for developers working with **WhatsApp Usernames** and the **WhatsApp Business Platform / Cloud API** — link generators, QR codes, and a free public REST API for both the consumer `@username` feature and Business-Scoped User IDs (BSUID).

Live site: **[whatsusernames.link](https://whatsusernames.link)** (English, Português, Español).

## What's in here

- **Link + QR generator** — turn a WhatsApp username or phone number into a shareable `wa.me` link and a customizable QR code (PNG/SVG, color, logo, transparency). No login, no database.
- **Public REST API v1** (`/api/v1/*`) — generate links, validate usernames/keys/phone numbers, render QR codes. Free, keyless, CORS-enabled, rate-limited by IP. Full docs at [`/developers`](https://whatsusernames.link/developers), machine-readable spec at [`/api/v1/openapi.json`](https://whatsusernames.link/api/v1/openapi.json) (OpenAPI 3.1).
- **Business Platform API** (`/api/v1/business/*`) — validate and parse BSUIDs, validate business usernames, resolve a contact from bsuid/phone/username, and normalize raw WhatsApp Cloud API webhook payloads into a consistent shape.
- **Blog** — trilingual (EN/PT/ES) articles on WhatsApp usernames, BSUID, and the Cloud API, at [`/blog`](https://whatsusernames.link/blog).

## Why it's stateless

There is no database. Short links, QR codes, and BSUID/webhook parsing are all pure, deterministic functions of their input — the username or phone number *is* the link. This keeps the whole project self-hostable with zero infrastructure beyond a Next.js deploy target.

## Tech stack

Next.js 15 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS · shadcn/ui · next-intl (i18n) · Vitest · pnpm.

## Getting started

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
pnpm test                 # Vitest — link generation, validators, business/BSUID logic, API routes
pnpm lint                 # ESLint
pnpm exec tsc --noEmit    # Type-check
pnpm build                # Production build
```

## Environment variables

```bash
cp .env.local.example .env.local
```

- `NEXT_PUBLIC_SITE_URL` — domain used in metadata/OG/canonical URLs (defaults to `http://localhost:3000` in dev).
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` (or the Vercel-Upstash-injected `KV_REST_API_URL` / `KV_REST_API_TOKEN`) — optional, power API rate limiting. The rate limiter fails open (allows requests) when absent, so the app runs fine without them.

## A note on `wa.me/<username>` links

WhatsApp's consumer username feature is in a phased regional rollout, and `wa.me/<username>` links do not open a chat for every account yet. All link-format logic lives in `lib/whatsapp/generateLink.ts` — the single file to update once WhatsApp publishes an official deep-link format. Phone-number links (`wa.me/<phone>`) are officially documented and work everywhere today.

## Contributing

Issues and PRs welcome. This project has no formal contribution process yet — open an issue to discuss non-trivial changes before sending a PR.

## License

[MIT](./LICENSE)
