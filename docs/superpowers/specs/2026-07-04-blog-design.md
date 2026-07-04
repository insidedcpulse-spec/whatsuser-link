# Blog — Design Spec

Date: 2026-07-04
Status: Approved

## Objective

Add a blog section to whatsuser-link (Next.js 15 App Router + next-intl) for SEO on long-tail keywords about WhatsApp usernames, wa.me links, and QR codes. Must not break existing routes, metadata, or sitemap.

## Content structure

- MDX files at `content/blog/{locale}/{slug}.mdx`, one file per locale per post.
- Same slug across all three locales (`en`, `pt`, `es`) for a translated post — matches the existing pattern used by `how-to-create-a-whatsapp-link` (same path across locales).
- Frontmatter fields (all required except noted):
  - `title: string`
  - `description: string` (meta description)
  - `date: string` (ISO `YYYY-MM-DD`)
  - `slug: string` (must match the filename)
  - `heroImage: string` (path under `/public/blog/{slug}/hero.svg`)
  - `heroImageAlt: string`
- No `heroImageCredit` field — hero/inline images are custom SVGs authored for this project, not third-party stock photos, so no attribution is required.

## Images

- Hero image per post: custom abstract SVG (chat bubble / QR code / phone motifs) in the site's WhatsApp-green brand color, stored at `public/blog/{slug}/hero.svg`.
- No external image hosts, no remote `next.config.ts` image domains needed, no API keys, no network calls at build or request time.
- Rendered via `next/image` where practical; SVGs are lightweight enough to render directly as `<Image>` with fixed dimensions (no lazy-load concerns for a single hero per page).
- No inline images planned for the initial 5 articles (600-900 word posts don't need them); can be added later per-post if a post benefits from a diagram.

## Rendering

- `next-mdx-remote/rsc` + `gray-matter` for reading frontmatter and compiling MDX server-side. Chosen over `@next/mdx` because content lives outside `app/` in a `content/` directory keyed by locale+slug, which fits a "read file → compile" flow better than the page-based `@next/mdx` convention.
- A small loader module (e.g. `lib/blog.ts`) exposes:
  - `getPostSlugs(locale): string[]` — reads filenames in `content/blog/{locale}/`
  - `getPost(locale, slug): { frontmatter, content } | null`
  - `getAllPosts(locale): { frontmatter }[]` sorted by date desc

## Routes

- `app/[locale]/blog/page.tsx` — listing page.
  - Grid of shadcn `Card` components: hero image, title, excerpt (`description`), formatted date.
  - If a locale has zero posts (initially `en` and `es`), render an elegant empty state ("Articles coming soon" / "Artículos próximamente") instead of an empty grid or 404.
- `app/[locale]/blog/[slug]/page.tsx` — article page.
  - `generateStaticParams` returns only slugs that have an `.mdx` file for that locale (no placeholder/404 pages for untranslated posts).
  - Layout: hero image full-width at top, reading column max-width ~700px, MDX content, CTA block at the end linking to `/` (or `/{locale}` for non-default locales) pointing back to the generator.
  - Requesting a slug with no MDX file for that locale → Next.js `notFound()`.

## SEO

- `generateMetadata()` per article: `title`, `description`, `alternates.canonical`, Open Graph (`title`, `description`, `url`, `siteName`, `type: "article"`, `images: [heroImage]`), same pattern as the existing guide page (`app/[locale]/how-to-create-a-whatsapp-link/page.tsx`).
- `alternates.languages` set per article to whichever locales actually have that slug translated (not all 3 unconditionally — avoids hreflang pointing at pages that don't exist).
- JSON-LD `BlogPosting` (new helper in `lib/json-ld.ts`): `headline`, `description`, `datePublished`, `image`, `author` (site name), reusing `<JsonLdScript>`.
- JSON-LD `BreadcrumbList` (Home > Blog > Article title), new helper alongside the above.
- `app/sitemap.ts`: extend with one `entries()`-style block per discovered slug, iterating actual MDX files per locale (not all locales unconditionally) so untranslated posts aren't listed for `en`/`es` yet. Blog listing pages (`/blog`, `/pt/blog`, `/es/blog`) are always included since they always resolve (empty-state or not).

## Design / components

- Reuse existing design system: shadcn `Card`, `buttonVariants`, Tailwind tokens already defined in `app/globals.css`, `Link` from `@/i18n/navigation`.
- No new dependencies beyond `next-mdx-remote` and `gray-matter` (both lightweight, no heavy transitive deps).

## Content for this delivery

5 MDX articles in Portuguese only (`content/blog/pt/{slug}.mdx`), 600-900 words each, direct/practical tone:

1. `como-reservar-username-whatsapp-2026` — Como reservar o teu username no WhatsApp em 2026
2. `username-key-whatsapp` — O que é a Username Key do WhatsApp e porque devias ativá-la
3. `wa-me-username-alternativas` — wa.me/username ainda não existe: o que usar agora para partilhar o teu username
4. `link-whatsapp-qr-code-gratis` — Guia completo: como criar um link do WhatsApp com QR code grátis
5. `usernames-vs-numero-telefone-privacidade` — Usernames vs número de telefone: qual a diferença de privacidade no WhatsApp

Each article must state explicitly when something (e.g. the `wa.me/username` link format) is not yet officially confirmed by WhatsApp/Meta, rather than presenting it as fact.

EN/ES translations are out of scope for this delivery — those locales show the empty-state blog listing only. No English/Spanish MDX files, no per-post hreflang entries pointing at them.

## Out of scope

- Unsplash/Pexels API integration, remote image domains, attribution UI — not needed since images are custom SVG.
- Inline images within article bodies.
- Comments, tags/categories, pagination, RSS feed — 5 posts don't need any of this yet.
- EN/ES article content (translation is a future delivery).

## Verification

- `npm run build` must pass with no errors before this is considered done.
- Manually check: `/blog`, `/blog/{slug}` for each of the 5 posts, `/pt/blog`, `/pt/blog/{slug}` for each, `/es/blog` (empty state), sitemap.xml includes new routes, existing routes (`/`, `/pt`, `/es`, `/how-to-create-a-whatsapp-link`, privacy/terms) still resolve.
