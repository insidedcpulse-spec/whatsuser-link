# Blog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/blog` section (MDX-powered, next-intl aware) to whatsuser-link with 5 Portuguese articles, full SEO metadata/JSON-LD, and sitemap coverage, without breaking any existing route.

**Architecture:** Content lives as MDX files under `content/blog/{locale}/{slug}.mdx` (frontmatter + body), read by a small `lib/blog.ts` loader (`fs` + `gray-matter`, no network/API calls). Two new App Router pages (`app/[locale]/blog/page.tsx` listing, `app/[locale]/blog/[slug]/page.tsx` article) render this content using `next-mdx-remote/rsc`, reusing the existing design system (shadcn `Card`, Tailwind tokens, `next-intl` `Link`/`getTranslations`) and existing SEO helpers (`lib/json-ld.ts`, `JsonLdScript`). Hero images are hand-authored SVGs under `public/blog/{slug}/hero.svg` — no third-party image APIs, no attribution UI, no remote image domains.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, next-intl, Tailwind v4 + shadcn/ui, `next-mdx-remote/rsc`, `gray-matter`, `remark-gfm`, Vitest.

---

## Spec reference

Full design rationale: `docs/superpowers/specs/2026-07-04-blog-design.md`. Key decisions already made (do not re-litigate during implementation):
- Same slug across all 3 locales for a translated post.
- Hero images are custom SVGs, not stock photos — no `heroImageCredit` field.
- Only Portuguese (`pt`) articles ship in this delivery. `en`/`es` blog listing pages exist and show an empty state.
- `next-mdx-remote/rsc` + `gray-matter`, not `@next/mdx`.

---

### Task 1: Install MDX dependencies

**Files:**
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`

- [ ] **Step 1: Install packages**

Run: `pnpm add next-mdx-remote gray-matter remark-gfm`

- [ ] **Step 2: Verify they landed in package.json**

Run: `grep -E "\"(next-mdx-remote|gray-matter|remark-gfm)\"" package.json`
Expected: three lines, one per package, each with a version string.

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add next-mdx-remote, gray-matter, remark-gfm for blog MDX"
```

---

### Task 2: Allow SVG through the Next.js image optimizer

**Files:**
- Modify: `next.config.ts`

The blog's hero images are local SVGs. Next.js disables SVG optimization by default for security (arbitrary SVG can carry `<script>`); since these SVGs are all hand-authored by us (not user-uploaded), it's safe to allow them with the standard locked-down CSP Next.js recommends for this case.

- [ ] **Step 1: Update the config**

Replace the full contents of `next.config.ts` with:

```ts
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: "inline",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default withNextIntl(nextConfig);
```

- [ ] **Step 2: Verify the project still type-checks**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add next.config.ts
git commit -m "feat: allow SVG images through next/image for blog hero images"
```

---

### Task 3: `lib/blog.ts` content loader (TDD)

**Files:**
- Create: `lib/blog.ts`
- Test: `lib/blog.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/blog.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { getAllPosts, getPost, getPostSlugs } from "@/lib/blog";

describe("blog content loader", () => {
  it("returns an empty slug list for a locale with no content directory", () => {
    expect(getPostSlugs("en")).toEqual([]);
  });

  it("returns an empty post list for a locale with no content directory", () => {
    expect(getAllPosts("en")).toEqual([]);
  });

  it("returns null for a slug that does not exist", () => {
    expect(getPost("en", "does-not-exist")).toBeNull();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run lib/blog.test.ts`
Expected: FAIL — `Cannot find module '@/lib/blog'` (or similar resolution error), since `lib/blog.ts` doesn't exist yet.

- [ ] **Step 3: Implement the loader**

Create `lib/blog.ts`:

```ts
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

export type BlogFrontmatter = {
  title: string;
  description: string;
  date: string;
  slug: string;
  heroImage: string;
  heroImageAlt: string;
};

export type BlogPost = {
  frontmatter: BlogFrontmatter;
  content: string;
};

const CONTENT_ROOT = path.join(process.cwd(), "content", "blog");

export function getPostSlugs(locale: string): string[] {
  const dir = path.join(CONTENT_ROOT, locale);

  if (!fs.existsSync(dir)) {
    return [];
  }

  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".mdx"))
    .map((file) => file.replace(/\.mdx$/, ""));
}

export function getPost(locale: string, slug: string): BlogPost | null {
  const filePath = path.join(CONTENT_ROOT, locale, `${slug}.mdx`);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  const raw = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(raw);

  return { frontmatter: data as BlogFrontmatter, content };
}

export function getAllPosts(locale: string): BlogPost[] {
  return getPostSlugs(locale)
    .map((slug) => getPost(locale, slug))
    .filter((post): post is BlogPost => post !== null)
    .sort((a, b) => (a.frontmatter.date < b.frontmatter.date ? 1 : -1));
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run lib/blog.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/blog.ts lib/blog.test.ts
git commit -m "feat: add blog content loader (lib/blog.ts)"
```

---

### Task 4: JSON-LD helpers for BlogPosting and Breadcrumb (TDD)

**Files:**
- Modify: `lib/json-ld.ts`
- Test: `lib/json-ld.test.ts` (new file — no test currently covers `lib/json-ld.ts`; only the two new functions are tested here, matching the "test what you touch" scope)

- [ ] **Step 1: Write the failing test**

Create `lib/json-ld.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { getBlogPostingJsonLd, getBreadcrumbJsonLd } from "@/lib/json-ld";

describe("getBlogPostingJsonLd", () => {
  it("builds a BlogPosting schema with the given fields", () => {
    const result = getBlogPostingJsonLd({
      headline: "Title",
      description: "Description",
      datePublished: "2026-01-01",
      image: "https://whatsusernames.link/blog/slug/hero.svg",
      url: "https://whatsusernames.link/blog/slug",
    });

    expect(result["@type"]).toBe("BlogPosting");
    expect(result.headline).toBe("Title");
    expect(result.datePublished).toBe("2026-01-01");
    expect(result.author).toEqual({ "@type": "Organization", name: "WhatsUser.link" });
  });
});

describe("getBreadcrumbJsonLd", () => {
  it("builds an ordered BreadcrumbList", () => {
    const result = getBreadcrumbJsonLd([
      { name: "Home", url: "https://whatsusernames.link" },
      { name: "Blog", url: "https://whatsusernames.link/blog" },
    ]);

    expect(result["@type"]).toBe("BreadcrumbList");
    expect(result.itemListElement).toEqual([
      { "@type": "ListItem", position: 1, name: "Home", item: "https://whatsusernames.link" },
      { "@type": "ListItem", position: 2, name: "Blog", item: "https://whatsusernames.link/blog" },
    ]);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run lib/json-ld.test.ts`
Expected: FAIL — `getBlogPostingJsonLd is not a function` (or import error), since these exports don't exist yet.

- [ ] **Step 3: Add the two functions**

Append to the end of `lib/json-ld.ts`:

```ts
export function getBlogPostingJsonLd({
  headline,
  description,
  datePublished,
  image,
  url,
}: {
  headline: string;
  description: string;
  datePublished: string;
  image: string;
  url: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline,
    description,
    datePublished,
    image,
    url,
    author: {
      "@type": "Organization",
      name: siteConfig.name,
    },
  };
}

export type BreadcrumbItem = {
  name: string;
  url: string;
};

export function getBreadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run lib/json-ld.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Run the full test suite to confirm nothing else broke**

Run: `pnpm test`
Expected: all existing test files plus the two new ones PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/json-ld.ts lib/json-ld.test.ts
git commit -m "feat: add BlogPosting and BreadcrumbList JSON-LD helpers"
```

---

### Task 5: `blog` translation namespace (en, pt, es)

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/pt.json`
- Modify: `messages/es.json`

These are UI-chrome strings for the listing/article page templates (headings, empty state, CTA, breadcrumb labels) — not article content. All 3 locales need them since `/blog` and `/es/blog` render (with an empty state) even before translated articles exist.

- [ ] **Step 1: Add the `blog` key to `messages/en.json`**

Find the end of the file (the `"legal"` key's closing brace, right before the file's final `}`):

```json
        {
          "heading": "Contact",
          "body": ["Questions about these terms? Email contact@whatsusernames.link."]
        }
      ]
    }
  }
}
```

Replace it with:

```json
        {
          "heading": "Contact",
          "body": ["Questions about these terms? Email contact@whatsusernames.link."]
        }
      ]
    }
  },
  "blog": {
    "metaTitle": "Blog — WhatsUser.link",
    "metaDescription": "Practical guides on WhatsApp usernames, wa.me links, and QR codes.",
    "heading": "Blog",
    "intro": "Practical guides on WhatsApp usernames, sharing your link, and QR codes.",
    "emptyStateTitle": "Articles coming soon",
    "emptyStateBody": "We don't have articles in this language yet. Check back soon, or read the Portuguese version.",
    "readMore": "Read article",
    "ctaText": "Got your WhatsApp link ready?",
    "ctaButton": "Create my link",
    "breadcrumbHome": "Home",
    "breadcrumbBlog": "Blog"
  }
}
```

- [ ] **Step 2: Add the `blog` key to `messages/pt.json`**

Find the end of the file:

```json
        {
          "heading": "Contacto",
          "body": ["Dúvidas sobre estes termos? Envia email para contact@whatsusernames.link."]
        }
      ]
    }
  }
}
```

Replace it with:

```json
        {
          "heading": "Contacto",
          "body": ["Dúvidas sobre estes termos? Envia email para contact@whatsusernames.link."]
        }
      ]
    }
  },
  "blog": {
    "metaTitle": "Blog — WhatsUser.link",
    "metaDescription": "Guias práticos sobre usernames do WhatsApp, links wa.me e QR codes.",
    "heading": "Blog",
    "intro": "Guias práticos sobre usernames do WhatsApp, partilha de links e QR codes.",
    "emptyStateTitle": "Artigos em breve",
    "emptyStateBody": "Ainda não temos artigos nesta língua. Volta em breve ou lê a versão em português.",
    "readMore": "Ler artigo",
    "ctaText": "Já tens o teu link do WhatsApp pronto?",
    "ctaButton": "Criar o meu link",
    "breadcrumbHome": "Início",
    "breadcrumbBlog": "Blog"
  }
}
```

- [ ] **Step 3: Add the `blog` key to `messages/es.json`**

Find the end of the file:

```json
        {
          "heading": "Contacto",
          "body": ["¿Dudas sobre estos términos? Escribe a contact@whatsusernames.link."]
        }
      ]
    }
  }
}
```

Replace it with:

```json
        {
          "heading": "Contacto",
          "body": ["¿Dudas sobre estos términos? Escribe a contact@whatsusernames.link."]
        }
      ]
    }
  },
  "blog": {
    "metaTitle": "Blog — WhatsUser.link",
    "metaDescription": "Guías prácticas sobre nombres de usuario de WhatsApp, enlaces wa.me y códigos QR.",
    "heading": "Blog",
    "intro": "Guías prácticas sobre nombres de usuario de WhatsApp, cómo compartir tu enlace y códigos QR.",
    "emptyStateTitle": "Artículos próximamente",
    "emptyStateBody": "Todavía no tenemos artículos en este idioma. Vuelve pronto o lee la versión en portugués.",
    "readMore": "Leer artículo",
    "ctaText": "¿Ya tienes listo tu enlace de WhatsApp?",
    "ctaButton": "Crear mi enlace",
    "breadcrumbHome": "Inicio",
    "breadcrumbBlog": "Blog"
  }
}
```

- [ ] **Step 4: Verify all 3 files are still valid JSON**

Run: `node -e "['en','pt','es'].forEach(l => { const d = require('./messages/'+l+'.json'); console.log(l, Object.keys(d.blog)); })"`
Expected: 3 lines printed, each listing the 10 `blog` keys (`metaTitle`, `metaDescription`, `heading`, `intro`, `emptyStateTitle`, `emptyStateBody`, `readMore`, `ctaText`, `ctaButton`, `breadcrumbHome`, `breadcrumbBlog` — 11 keys total).

- [ ] **Step 5: Commit**

```bash
git add messages/en.json messages/pt.json messages/es.json
git commit -m "feat: add blog translation namespace (en, pt, es)"
```

---

### Task 6: Hero SVGs for the 5 articles

**Files:**
- Create: `public/blog/como-reservar-username-whatsapp-2026/hero.svg`
- Create: `public/blog/username-key-whatsapp/hero.svg`
- Create: `public/blog/wa-me-username-alternativas/hero.svg`
- Create: `public/blog/link-whatsapp-qr-code-gratis/hero.svg`
- Create: `public/blog/usernames-vs-numero-telefone-privacidade/hero.svg`

All 5 are self-contained 1200×630 SVGs (OG-image aspect ratio) using the site's brand colors (`#075E54` dark teal → `#25D366` WhatsApp green, from `public/chat-icon.svg`), each with a distinct abstract motif for its topic. No third-party assets, no attribution needed.

- [ ] **Step 1: Create the "reserve your username" hero (chat bubble + star)**

Create `public/blog/como-reservar-username-whatsapp-2026/hero.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" role="img" aria-hidden="true">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#075E54"/>
      <stop offset="100%" stop-color="#25D366"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <circle cx="960" cy="150" r="220" fill="#ffffff" opacity="0.06"/>
  <circle cx="180" cy="520" r="160" fill="#ffffff" opacity="0.06"/>
  <g transform="translate(430,140)">
    <path d="M0 90c0-49.7 40.3-90 90-90h160c49.7 0 90 40.3 90 90s-40.3 90-90 90H140l-60 50 8-52C46.4 158.5 0 129 0 90z" fill="#ffffff"/>
    <circle cx="90" cy="90" r="14" fill="#25D366"/>
    <circle cx="170" cy="90" r="14" fill="#25D366"/>
    <circle cx="250" cy="90" r="14" fill="#25D366"/>
  </g>
  <g transform="translate(560,330)">
    <path d="M60 0l16.9 34.3 37.8 5.5-27.4 26.7 6.5 37.6L60 86.1 25.2 104.1l6.5-37.6L4.3 39.8l37.8-5.5z" fill="#FFD700"/>
  </g>
</svg>
```

- [ ] **Step 2: Create the "Username Key" hero (key + lock)**

Create `public/blog/username-key-whatsapp/hero.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" role="img" aria-hidden="true">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#075E54"/>
      <stop offset="100%" stop-color="#25D366"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <circle cx="200" cy="120" r="180" fill="#ffffff" opacity="0.06"/>
  <circle cx="1020" cy="500" r="220" fill="#ffffff" opacity="0.06"/>
  <g transform="translate(430,215) rotate(-20)">
    <circle cx="70" cy="70" r="70" fill="none" stroke="#ffffff" stroke-width="26"/>
    <rect x="130" y="55" width="220" height="30" fill="#ffffff"/>
    <rect x="300" y="85" width="30" height="55" fill="#ffffff"/>
    <rect x="250" y="85" width="30" height="80" fill="#ffffff"/>
  </g>
</svg>
```

- [ ] **Step 3: Create the "wa.me alternatives" hero (broken link + QR fallback)**

Create `public/blog/wa-me-username-alternativas/hero.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" role="img" aria-hidden="true">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#075E54"/>
      <stop offset="100%" stop-color="#25D366"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <circle cx="1000" cy="140" r="200" fill="#ffffff" opacity="0.06"/>
  <circle cx="160" cy="500" r="160" fill="#ffffff" opacity="0.06"/>
  <g stroke="#ffffff" stroke-width="24" stroke-linecap="round" fill="none">
    <path d="M420 260c-30-30-80-30-110 0l-40 40c-30 30-30 80 0 110s80 30 110 0l20-20"/>
    <path d="M500 370c30 30 80 30 110 0l40-40c30-30 30-80 0-110s-80-30-110 0l-20 20"/>
  </g>
  <g transform="translate(700,300)" fill="#ffffff">
    <rect x="0" y="0" width="36" height="36"/>
    <rect x="46" y="0" width="36" height="36"/>
    <rect x="0" y="46" width="36" height="36"/>
    <rect x="92" y="0" width="36" height="36"/>
    <rect x="46" y="46" width="36" height="36"/>
    <rect x="92" y="46" width="36" height="36"/>
    <rect x="0" y="92" width="36" height="36"/>
    <rect x="92" y="92" width="36" height="36"/>
  </g>
</svg>
```

- [ ] **Step 4: Create the "QR code guide" hero (full QR motif)**

Create `public/blog/link-whatsapp-qr-code-gratis/hero.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" role="img" aria-hidden="true">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#075E54"/>
      <stop offset="100%" stop-color="#25D366"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <circle cx="200" cy="500" r="200" fill="#ffffff" opacity="0.06"/>
  <g transform="translate(450,115)">
    <rect x="0" y="0" width="400" height="400" rx="16" fill="#ffffff"/>
    <g fill="#075E54">
      <rect x="30" y="30" width="90" height="90"/>
      <rect x="280" y="30" width="90" height="90"/>
      <rect x="30" y="280" width="90" height="90"/>
      <rect x="150" y="30" width="24" height="24"/>
      <rect x="200" y="30" width="24" height="24"/>
      <rect x="150" y="80" width="24" height="24"/>
      <rect x="200" y="140" width="24" height="24"/>
      <rect x="150" y="180" width="24" height="24"/>
      <rect x="250" y="150" width="24" height="24"/>
      <rect x="30" y="180" width="24" height="24"/>
      <rect x="180" y="230" width="24" height="24"/>
      <rect x="230" y="230" width="24" height="24"/>
      <rect x="280" y="200" width="24" height="24"/>
      <rect x="150" y="280" width="24" height="24"/>
      <rect x="200" y="320" width="24" height="24"/>
      <rect x="250" y="280" width="24" height="24"/>
      <rect x="330" y="280" width="24" height="24"/>
      <rect x="280" y="330" width="24" height="24"/>
    </g>
    <g fill="#ffffff">
      <rect x="60" y="60" width="30" height="30"/>
      <rect x="310" y="60" width="30" height="30"/>
      <rect x="60" y="310" width="30" height="30"/>
    </g>
  </g>
</svg>
```

- [ ] **Step 5: Create the "privacy" hero (shield + eye)**

Create `public/blog/usernames-vs-numero-telefone-privacidade/hero.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" role="img" aria-hidden="true">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#075E54"/>
      <stop offset="100%" stop-color="#25D366"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <circle cx="1020" cy="130" r="190" fill="#ffffff" opacity="0.06"/>
  <circle cx="180" cy="520" r="150" fill="#ffffff" opacity="0.06"/>
  <g transform="translate(490,140)">
    <path d="M110 0 220 40v120c0 90-55 150-110 170C55 310 0 250 0 160V40z" fill="#ffffff"/>
    <g transform="translate(35,150)" stroke="#25D366" stroke-width="12" fill="none" stroke-linecap="round">
      <path d="M0 20c30-35 120-35 150 0"/>
      <line x1="-10" y1="45" x2="160" y2="-10"/>
    </g>
    <circle cx="110" cy="165" r="16" fill="#25D366"/>
  </g>
</svg>
```

- [ ] **Step 6: Verify all 5 files exist and are well-formed XML**

Run:
```bash
for f in public/blog/*/hero.svg; do echo "$f"; python3 -c "import xml.dom.minidom as m; m.parse('$f')" && echo OK; done
```
Expected: 5 filenames each followed by `OK`.

- [ ] **Step 7: Commit**

```bash
git add public/blog
git commit -m "feat: add custom SVG hero images for the 5 blog articles"
```

---

### Task 7: MDX article content (5 Portuguese posts) + extend loader tests

**Files:**
- Create: `content/blog/pt/como-reservar-username-whatsapp-2026.mdx`
- Create: `content/blog/pt/username-key-whatsapp.mdx`
- Create: `content/blog/pt/wa-me-username-alternativas.mdx`
- Create: `content/blog/pt/link-whatsapp-qr-code-gratis.mdx`
- Create: `content/blog/pt/usernames-vs-numero-telefone-privacidade.mdx`
- Modify: `lib/blog.test.ts`

Facts used across these articles must stay consistent with the site's own established position (see `messages/pt.json` → `guide` namespace and `lib/whatsapp/generateLink.ts`): WhatsApp is rolling out `@username` identifiers and an optional "Username Key" disambiguator during 2026; `wa.me/username` is **not yet an officially confirmed, functioning link format** — it does not open a chat automatically today.

- [ ] **Step 1: Create article 1**

Create `content/blog/pt/como-reservar-username-whatsapp-2026.mdx`:

```mdx
---
title: "Como reservar o teu username no WhatsApp em 2026"
description: "Passo a passo para definires o teu @username no WhatsApp antes que outra pessoa o reserve, incluindo o que fazer enquanto o wa.me/username não funciona."
date: "2026-06-01"
slug: "como-reservar-username-whatsapp-2026"
heroImage: "/blog/como-reservar-username-whatsapp-2026/hero.svg"
heroImageAlt: "Ilustração de uma bolha de conversa com uma estrela, simbolizando reservar um username no WhatsApp"
---

## Porque vale a pena reservar já

O WhatsApp está a lançar identificadores @username por fases durante 2026, à semelhança do que o Telegram e o Instagram já fazem há anos. Em vez de dependeres só do teu número de telefone para que alguém te contacte, vais poder partilhar um nome único.

Como em qualquer sistema de nomes únicos, quem chega primeiro escolhe o nome que quer. Se o teu nome de marca, negócio ou identidade pessoal é procurado, vale a pena reservar assim que a funcionalidade estiver disponível na tua conta — antes que outra pessoa (ou um perfil falso) o reserve primeiro.

## O que precisas antes de começar

- Uma conta WhatsApp atualizada — a funcionalidade está a chegar por fases, por isso pode ainda não estar visível no teu perfil mesmo com a app atualizada.
- O username já decidido com antecedência: letras, números e pontos ou underscores costumam ser aceites, mas a lista exata de caracteres pode variar até o lançamento estar completo.
- Um plano B, caso o nome que querias já esteja reservado.

## Passo a passo

1. **Atualiza o WhatsApp** para a versão mais recente disponível na tua app store.
2. **Abre Definições → Perfil.** Se a funcionalidade já chegou à tua conta, vais ver uma opção para definir ou editar o teu @username.
3. **Escreve o username** que queres. O WhatsApp diz-te se está disponível.
4. **Confirma.** O teu username fica associado à conta — o número de telefone continua a existir por trás, não é substituído.
5. **Considera ativar uma Username Key**, sobretudo se o teu nome for comum.

## O que fazer depois de reservares

Depois de definires o username, o passo lógico é torná-lo partilhável. É aqui que entra este site: colas o teu username no gerador, e criamos um link e QR code prontos a partilhar — cartão de visita, bio de rede social, montra da loja, o que precisares.

Importante: neste momento, um link no formato `wa.me/username` **ainda não abre automaticamente uma conversa**, porque a WhatsApp ainda não publicou essa especificação. Quem recebe o teu link ou digitaliza o QR code precisa de abrir o WhatsApp e procurar o teu username manualmente dentro da app. Assim que a WhatsApp confirmar o formato oficial, o gerador é atualizado — não precisas de fazer nada de novo.

Se precisares de um link que abra o chat já hoje, sem esperar por essa atualização, usa antes o gerador por número de telefone disponível na página principal deste site.

## Erros comuns a evitar

- **Escolher um username só de números** — perde-se a vantagem de ser memorizável, que é o motivo principal para usar usernames em vez do número.
- **Não verificar se o nome já existe noutras redes tuas** (Instagram, X, TikTok) — consistência entre plataformas ajuda quem te procura a confirmar que é mesmo a tua conta.
- **Esquecer de rever a privacidade do perfil.** Ter um username público não significa que tens de mostrar o teu número — revê as definições de privacidade depois de ativares o username.

## Resumo

Reservar o teu username agora garante que ficas com o nome que queres antes que fique indisponível. O processo demora dois minutos: atualizar a app, definir o nome em Definições → Perfil, e (recomendado) ativar uma Username Key. O link automático ainda não existe oficialmente, mas o teu QR code e link partilhável já podem estar prontos hoje.
```

- [ ] **Step 2: Create article 2**

Create `content/blog/pt/username-key-whatsapp.mdx`:

```mdx
---
title: "O que é a Username Key do WhatsApp e porque devias ativá-la"
description: "Percebe o que é a Username Key do WhatsApp, quando é atribuída, e porque compensa incluí-la sempre que partilhares o teu username."
date: "2026-06-08"
slug: "username-key-whatsapp"
heroImage: "/blog/username-key-whatsapp/hero.svg"
heroImageAlt: "Ilustração de uma chave, simbolizando a Username Key do WhatsApp"
---

## O problema que a Username Key resolve

Um username sozinho não é garantidamente único em todo o mundo — se muita gente quiser "joao.silva" ou "loja.maria", o WhatsApp precisa de uma forma de distinguir contas com o mesmo nome. É para isso que serve a Username Key: um código curto, atribuído pela WhatsApp, que acompanha o teu username e identifica a tua conta especificamente, mesmo que outra pessoa tenha escolhido o mesmo nome.

## Como funciona, na prática

Quando ativas ou recebes uma Username Key, ela passa a viajar junto do teu username sempre que o partilhas — normalmente como um código curto depois do nome (o formato exato depende da versão da app). Quem recebe o teu contacto com a Key consegue confirmar que está a falar com a tua conta e não com um homónimo.

## Porque vale a pena ativá-la mesmo com um username pouco comum

Mesmo achando que o teu username é único hoje, isso pode mudar:

- **A WhatsApp continua a crescer.** Milhões de contas novas vão escolher usernames ao longo de 2026 — o espaço de nomes fica mais concorrido com o tempo.
- **Proteção contra contas falsas.** Uma Key dificulta que alguém crie uma conta com um username parecido ao teu para se fazer passar por ti.
- **É gratuita e opcional de mostrar.** Ativar não te obriga a partilhá-la sempre; podes optar por incluí-la só em contextos onde a confirmação de identidade importa (ex: atendimento ao cliente, vendas).

## Quando é que compensa mais incluir a Key ao partilhar

- Em contexto profissional ou de negócio, onde a confiança do contacto importa (lojas online, suporte ao cliente, prestadores de serviço).
- Se o teu username é composto por palavras comuns (nomes próprios, marcas genéricas).
- Em QR codes impressos ou permanentes (cartão de visita, montra) — nestes locais não podes corrigir facilmente se alguém confundir contigo outra conta.

## Como incluir a Key no teu link e QR code

No gerador deste site, depois de escreveres o teu username, há um campo opcional para a Username Key. Se a preencheres, ela é incluída automaticamente no link e no QR code gerados, sem precisares de a escrever à mão sempre que partilhas.

## Nota sobre o estado atual da funcionalidade

Tal como o próprio sistema de usernames, a Username Key está a ser lançada por fases pela WhatsApp — pode não estar disponível ainda na tua conta, mesmo com a app atualizada. E, tal como acontece com o `wa.me/username`, a forma exata como a Key é apresentada num link partilhável ainda depende de especificação oficial da WhatsApp, que pode mudar até ao lançamento estar completo.

## Resumo

A Username Key existe para garantir que, mesmo num sistema de nomes onde a duplicação é possível, quem te contacta sabe que está mesmo a falar contigo. Custa segundos a ativar e a incluir no teu link — vale sempre a pena, principalmente se usas o WhatsApp para fins profissionais.
```

- [ ] **Step 3: Create article 3**

Create `content/blog/pt/wa-me-username-alternativas.mdx`:

```mdx
---
title: "wa.me/username ainda não existe: o que usar agora para partilhar o teu username"
description: "O link wa.me/username ainda não abre conversa automaticamente no WhatsApp. Explicamos porquê e o que usar hoje para partilhares o teu contacto sem fricção."
date: "2026-06-15"
slug: "wa-me-username-alternativas"
heroImage: "/blog/wa-me-username-alternativas/hero.svg"
heroImageAlt: "Ilustração de uma corrente partida junto a um código QR, simbolizando alternativas ao link wa.me/username"
---

## O que as pessoas esperam (e o que ainda não existe)

Quem já usou `wa.me/351912345678` para partilhar um contacto de WhatsApp por número de telefone espera, razoavelmente, que exista um equivalente para usernames — algo como `wa.me/joao.silva`, que abrisse logo uma conversa. **Esse formato ainda não existe oficialmente.** A WhatsApp lançou os usernames como identificador de perfil, mas não publicou (até à data desta publicação) uma especificação de link público que abra automaticamente um chat a partir do username, do mesmo modo que já acontece com o número.

## Porque isto importa para quem partilha um link

Se colocares um link no formato `wa.me/username` — seja porque assumiste esse formato, seja porque copiaste de um gerador que o inventou — quem clicar não vai cair automaticamente numa conversa contigo. Na melhor das hipóteses, o link não faz nada; na pior, abre o WhatsApp numa pesquisa vazia ou numa página de erro, e a pessoa desiste.

## O que usar agora, enquanto o formato oficial não chega

**1. Link por número de telefone (funciona hoje).**
Se já tens o teu número associado ao WhatsApp e não te importas de o partilhar, o link `wa.me/<número com indicativo>` continua a ser a forma garantida de abrir uma conversa diretamente, sem qualquer passo manual. É o que recomendamos sempre que precisas de um link que funcione já, sem exceções.

**2. Username + instrução manual, para quem quer evitar o número.**
Se preferes não expor o teu número, podes partilhar o teu @username (e a Username Key, se a tiveres) em texto ou QR code, mas com uma instrução clara: "Procura-me no WhatsApp por @username". A pessoa abre a app, usa a pesquisa de contactos por username, e encontra-te — só que exige esse passo extra manual, não é automático como um clique.

**3. QR code híbrido.**
Uma boa prática, enquanto o link automático não existe, é usar um QR code que mostra visualmente o teu username por baixo do código — mesmo que quem digitaliza não tenha uma app preparada para abrir automaticamente uma conversa por username, vê pelo menos o nome exato a procurar, sem erros de escrita.

## O que este site faz enquanto isto não muda

O gerador deste site cria já o teu link no formato `wa.me/u/username` (uma aposta razoável, alinhada com convenções que a WhatsApp já usa noutros contextos), mas deixa sempre claro — como este artigo — que esse link ainda não abre conversa sozinho. Assim que a WhatsApp publicar o formato oficial, o gerador é atualizado automaticamente, sem qualquer ação da tua parte.

## O que vigiar para saberes quando isto muda

A confirmação oficial deve vir de um anúncio da própria WhatsApp/Meta ou de uma atualização da app que passe a abrir conversas reais a partir de um link de username. Até lá, qualquer alegação de que "já funciona" deve ser tratada com desconfiança — inclusive quando vem de geradores de link de terceiros.

## Resumo

Não é um bug nem uma limitação deste site: o link direto `wa.me/username` simplesmente ainda não foi lançado oficialmente pela WhatsApp. Para uma solução que funciona hoje sem surpresas, usa o link por número de telefone; para partilhar sem expor o número, usa o username com uma instrução clara de pesquisa manual.
```

- [ ] **Step 4: Create article 4**

Create `content/blog/pt/link-whatsapp-qr-code-gratis.mdx`:

```mdx
---
title: "Guia completo: como criar um link do WhatsApp com QR code grátis"
description: "Passo a passo para gerares, grátis, um link de WhatsApp e o respetivo QR code em PNG, JPEG, SVG ou PDF — para cartão de visita, bio ou montra."
date: "2026-06-22"
slug: "link-whatsapp-qr-code-gratis"
heroImage: "/blog/link-whatsapp-qr-code-gratis/hero.svg"
heroImageAlt: "Ilustração de um código QR grande sobre fundo verde"
---

## Porque um QR code ajuda mais do que um link

Um link funciona bem online — numa bio, numa assinatura de email, num anúncio digital. Mas em qualquer contexto físico (cartão de visita, montra de loja, cartaz, embalagem de produto), não há onde clicar. É aqui que o QR code resolve: aponta a câmara, abre o WhatsApp, sem escrever nada.

## O que precisas antes de gerar o teu QR code

- **O teu número de telefone**, se quiseres um link que funcione já hoje (recomendado para a maioria dos casos).
- **Ou o teu @username** (e Username Key, se tiveres), se preferires não expor o número — sabendo que, por agora, quem digitalizar precisa de procurar o nome manualmente.
- Uma mensagem pré-preenchida opcional, se quiseres que a conversa já comece com um texto específico (ex: "Olá, vim através do vosso cartaz").

## Passo a passo no gerador

1. **Escolhe o modo:** número de telefone ou username, dependendo do que preferires partilhar.
2. **Preenche os dados.** No modo número, escolhe o país (o indicativo é preenchido automaticamente) e escreve o número sem o zero inicial. No modo username, escreve apenas o nome (e a Key opcional).
3. **Adiciona uma mensagem pré-definida**, se quiseres — é opcional, mas útil para contextos comerciais ("Quero saber mais sobre X").
4. **Confirma o link gerado.** O site mostra-te logo o URL final e o QR code correspondente, atualizados em tempo real à medida que escreves.
5. **Descarrega o QR code** no formato que precisares:
   - **PNG** — o mais universal, bom para redes sociais e documentos digitais.
   - **JPEG** — alternativa ao PNG, ficheiro mais leve, sem transparência.
   - **SVG** — vetorial, ideal se vais imprimir em grande formato (cartaz, montra) sem perder qualidade.
   - **PDF** — pronto a imprimir diretamente, útil para levar a uma tipografia.
6. **Copia também o link de texto**, com o botão "Copiar tudo", caso queiras partilhá-lo por escrito além do QR code.

## Onde usar o teu QR code

- **Cartão de visita** — poupa espaço e evita erros de transcrição do número.
- **Montra ou balcão da loja** — clientes contactam-te sem teres de estar disponível no momento.
- **Assinatura de email** — alternativa a escrever o número por extenso.
- **Embalagem de produto ou fatura** — bom para pedir suporte pós-venda diretamente.
- **Redes sociais** (como imagem) — quando a plataforma não permite links clicáveis diretos (ex: bio do Instagram como imagem fixa).

## Boas práticas ao imprimir um QR code

- Testa sempre o QR code impresso antes de produzires em grande quantidade — tamanhos muito pequenos ou papel brilhante podem dificultar a leitura.
- Garante contraste suficiente entre o código e o fundo — evita imprimir sobre fundos coloridos ou imagens.
- Deixa uma margem em branco à volta do código (a "quiet zone") — sem ela, algumas câmaras têm dificuldade em reconhecer o padrão.

## Resumo

Gerar um QR code de WhatsApp grátis demora menos de um minuto: escolhes número ou username, preenches os dados, e descarregas no formato que precisares — PNG, JPEG, SVG ou PDF. Para contextos físicos impressos, o QR code poupa fricção que um link sozinho não resolve.
```

- [ ] **Step 5: Create article 5**

Create `content/blog/pt/usernames-vs-numero-telefone-privacidade.mdx`:

```mdx
---
title: "Usernames vs número de telefone: qual a diferença de privacidade no WhatsApp"
description: "Compara a privacidade de partilhar o teu número de telefone com a de partilhar um @username no WhatsApp, e percebe qual escolher em cada situação."
date: "2026-06-29"
slug: "usernames-vs-numero-telefone-privacidade"
heroImage: "/blog/usernames-vs-numero-telefone-privacidade/hero.svg"
heroImageAlt: "Ilustração de um escudo com um ícone de privacidade"
---

## O problema de fundo: o número de telefone é informação sensível

Durante anos, a única forma de alguém te contactar no WhatsApp foi teres o número de telefone dessa pessoa (ou ela ter o teu). Isso significa que, sempre que partilhavas o teu contacto de WhatsApp publicamente — numa bio, num anúncio, num grupo — estavas também a expor o teu número de telefone a qualquer pessoa. Um número de telefone é um identificador que costuma estar ligado à tua identidade real, ao teu operador, por vezes até à tua localização aproximada.

## O que muda com os usernames

Com um @username, podes ser contactado sem que a outra pessoa veja o teu número. Isto é relevante sobretudo para:

- **Criadores de conteúdo e figuras públicas** que querem receber mensagens sem expor um número pessoal.
- **Pequenos negócios** que preferem separar o número pessoal do número/conta usado profissionalmente.
- **Vendas online** (marketplaces, redes sociais) onde partilhar o número publicamente atrai spam e chamadas indesejadas.

## O que NÃO muda automaticamente

Ativar um username não torna a tua conta anónima nem esconde automaticamente o teu número de quem já é teu contacto — as definições de privacidade do WhatsApp para número de telefone, foto de perfil e "visto por último" continuam a ser configuradas separadamente, em Definições → Privacidade. Um username resolve especificamente o problema de "como me encontras sem eu te dar o número", não o resto da privacidade da conta.

## Onde a Username Key entra na equação de privacidade

Uma Username Key não esconde mais nada sobre ti — a função dela é evitar que outra pessoa com o mesmo username seja confundida contigo. Mas indiretamente ajuda a privacidade de quem confia no teu contacto: reduz o risco de alguém enviar dados sensíveis, pagamentos ou informação de negócio para uma conta errada que apenas partilha o nome.

## Trade-off prático: funcionalidade vs privacidade, hoje

Como o link automático `wa.me/username` ainda não está disponível oficialmente, há hoje um trade-off real:

| | Link por número | Username |
|---|---|---|
| Abre conversa automaticamente hoje | Sim | Não (é preciso procurar manualmente) |
| Expõe o número de telefone | Sim | Não |
| Depende de lançamento completo da funcionalidade | Não | Sim |

Se a prioridade é que o link funcione sem fricção agora, o número de telefone continua a ser a opção mais fiável. Se a prioridade é não expor o número, mesmo com o passo manual extra, o username já é uma opção válida hoje.

## Como decidir qual usar

- **Contacto de suporte urgente ou vendas onde cada segundo de fricção custa uma conversão** → número de telefone.
- **Perfil público, bio de redes sociais, cartão de visita onde a privacidade do número importa mais do que a rapidez** → username, com instrução de pesquisa manual.
- **Não tens a certeza?** Este site permite gerar os dois tipos de link — testa qual funciona melhor para o teu caso e podes sempre trocar mais tarde.

## Resumo

Um username no WhatsApp resolve o problema de expor o número de telefone, mas ainda não iguala a conveniência de um link direto por número, porque o formato de link automático continua por confirmar oficialmente. A escolha certa depende de pesares privacidade contra conveniência imediata — e nada te impede de partilhar os dois, consoante o contexto.
```

- [ ] **Step 6: Extend `lib/blog.test.ts` to cover the real content**

Replace the full contents of `lib/blog.test.ts` with:

```ts
import { describe, expect, it } from "vitest";
import { getAllPosts, getPost, getPostSlugs } from "@/lib/blog";

describe("blog content loader", () => {
  it("returns an empty slug list for a locale with no content directory", () => {
    expect(getPostSlugs("en")).toEqual([]);
  });

  it("returns an empty post list for a locale with no content directory", () => {
    expect(getAllPosts("en")).toEqual([]);
  });

  it("returns null for a slug that does not exist", () => {
    expect(getPost("en", "does-not-exist")).toBeNull();
  });

  it("finds all 5 Portuguese articles", () => {
    expect(getPostSlugs("pt").sort()).toEqual(
      [
        "como-reservar-username-whatsapp-2026",
        "username-key-whatsapp",
        "wa-me-username-alternativas",
        "link-whatsapp-qr-code-gratis",
        "usernames-vs-numero-telefone-privacidade",
      ].sort()
    );
  });

  it("reads frontmatter for a known post", () => {
    const post = getPost("pt", "username-key-whatsapp");

    expect(post).not.toBeNull();
    expect(post?.frontmatter.title).toBe(
      "O que é a Username Key do WhatsApp e porque devias ativá-la"
    );
    expect(post?.frontmatter.heroImage).toBe("/blog/username-key-whatsapp/hero.svg");
    expect(post?.content).toContain("## O problema que a Username Key resolve");
  });

  it("sorts posts by date, most recent first", () => {
    const posts = getAllPosts("pt");

    expect(posts).toHaveLength(5);
    expect(posts[0].frontmatter.slug).toBe("usernames-vs-numero-telefone-privacidade");
    expect(posts[posts.length - 1].frontmatter.slug).toBe(
      "como-reservar-username-whatsapp-2026"
    );
  });
});
```

- [ ] **Step 7: Run the tests**

Run: `pnpm vitest run lib/blog.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 8: Commit**

```bash
git add content/blog lib/blog.test.ts
git commit -m "feat: add 5 Portuguese blog articles"
```

---

### Task 8: MDX component styling

**Files:**
- Create: `components/blog/mdx-components.tsx`

Maps MDX elements to Tailwind-styled elements matching the site's existing typography (no `@tailwindcss/typography` plugin is installed, so this is a deliberate, explicit mapping instead).

- [ ] **Step 1: Create the component**

Create `components/blog/mdx-components.tsx`:

```tsx
import type { MDXComponents } from "mdx/types";

export const blogMdxComponents: MDXComponents = {
  h2: (props) => <h2 className="mt-8 mb-3 text-xl font-semibold" {...props} />,
  h3: (props) => <h3 className="mt-6 mb-2 text-lg font-semibold" {...props} />,
  p: (props) => <p className="mb-4 text-muted-foreground" {...props} />,
  ul: (props) => <ul className="mb-4 list-disc pl-5 text-muted-foreground" {...props} />,
  ol: (props) => <ol className="mb-4 list-decimal pl-5 text-muted-foreground" {...props} />,
  li: (props) => <li className="mb-1" {...props} />,
  a: (props) => <a className="text-primary underline underline-offset-4" {...props} />,
  strong: (props) => <strong className="font-semibold text-foreground" {...props} />,
  table: (props) => (
    <div className="mb-4 overflow-x-auto">
      <table className="w-full border-collapse text-sm" {...props} />
    </div>
  ),
  th: (props) => <th className="border-b p-2 text-left font-semibold" {...props} />,
  td: (props) => <td className="border-b p-2 text-muted-foreground" {...props} />,
};
```

- [ ] **Step 2: Verify it type-checks**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/blog/mdx-components.tsx
git commit -m "feat: add MDX component styling for blog articles"
```

---

### Task 9: Blog listing page

**Files:**
- Create: `app/[locale]/blog/page.tsx`

- [ ] **Step 1: Create the page**

Create `app/[locale]/blog/page.tsx`:

```tsx
import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { getAllPosts } from "@/lib/blog";
import { routing } from "@/i18n/routing";
import { siteConfig } from "@/config/site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "blog" });
  const path = locale === routing.defaultLocale ? "/blog" : `/${locale}/blog`;

  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: { canonical: path },
    openGraph: {
      title: t("metaTitle"),
      description: t("metaDescription"),
      url: path,
      siteName: siteConfig.name,
      type: "website",
    },
  };
}

export default async function BlogIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "blog" });
  const posts = getAllPosts(locale);

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-8 px-4 py-24">
      <div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{t("heading")}</h1>
        <p className="mt-4 text-muted-foreground">{t("intro")}</p>
      </div>

      {posts.length === 0 ? (
        <div className="rounded-xl border p-8 text-center">
          <p className="text-lg font-medium">{t("emptyStateTitle")}</p>
          <p className="mt-2 text-muted-foreground">{t("emptyStateBody")}</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          {posts.map((post) => (
            <Link key={post.frontmatter.slug} href={`/blog/${post.frontmatter.slug}`}>
              <Card>
                <Image
                  src={post.frontmatter.heroImage}
                  alt={post.frontmatter.heroImageAlt}
                  width={1200}
                  height={630}
                  className="w-full"
                />
                <CardHeader>
                  <CardTitle>{post.frontmatter.title}</CardTitle>
                  <CardDescription>{post.frontmatter.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    {new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(
                      new Date(post.frontmatter.date)
                    )}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manually verify in dev**

Run: `pnpm dev` (in background) then:
- `curl -s http://localhost:3000/blog | grep -o "<h1[^<]*<[^>]*>[^<]*" ` — should show "Blog"
- `curl -s http://localhost:3000/pt/blog | grep -c "hero.svg"` — should print `5`
- `curl -s http://localhost:3000/es/blog | grep -o "Artículos próximamente"` — should print the empty-state text

Stop the dev server after checking.

- [ ] **Step 4: Commit**

```bash
git add app/\[locale\]/blog/page.tsx
git commit -m "feat: add blog listing page"
```

---

### Task 10: Blog article page

**Files:**
- Create: `app/[locale]/blog/[slug]/page.tsx`

- [ ] **Step 1: Create the page**

Create `app/[locale]/blog/[slug]/page.tsx`:

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { JsonLdScript } from "@/components/json-ld-script";
import { buttonVariants } from "@/components/ui/button";
import { blogMdxComponents } from "@/components/blog/mdx-components";
import { getPost, getPostSlugs } from "@/lib/blog";
import { getBlogPostingJsonLd, getBreadcrumbJsonLd } from "@/lib/json-ld";
import { routing } from "@/i18n/routing";
import { siteConfig } from "@/config/site";

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    getPostSlugs(locale).map((slug) => ({ locale, slug }))
  );
}

function articlePath(locale: string, slug: string) {
  return locale === routing.defaultLocale ? `/blog/${slug}` : `/${locale}/blog/${slug}`;
}

function blogIndexPath(locale: string) {
  return locale === routing.defaultLocale ? "/blog" : `/${locale}/blog`;
}

function localesWithSlug(slug: string) {
  return routing.locales.filter((locale) => getPost(locale, slug) !== null);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const post = getPost(locale, slug);

  if (!post) {
    return {};
  }

  const path = articlePath(locale, slug);
  const languages = Object.fromEntries(
    localesWithSlug(slug).map((l) => [l, articlePath(l, slug)])
  );

  return {
    title: post.frontmatter.title,
    description: post.frontmatter.description,
    alternates: { canonical: path, languages },
    openGraph: {
      title: post.frontmatter.title,
      description: post.frontmatter.description,
      url: path,
      siteName: siteConfig.name,
      type: "article",
      images: [{ url: post.frontmatter.heroImage }],
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const post = getPost(locale, slug);

  if (!post) {
    notFound();
  }

  const t = await getTranslations({ locale, namespace: "blog" });
  const path = articlePath(locale, slug);
  const dateLabel = new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(
    new Date(post.frontmatter.date)
  );

  return (
    <main className="flex min-h-screen flex-col items-center px-4 py-24">
      <div className="w-full max-w-3xl">
        <Image
          src={post.frontmatter.heroImage}
          alt={post.frontmatter.heroImageAlt}
          width={1200}
          height={630}
          priority
          className="w-full rounded-xl"
        />
      </div>

      <article className="mt-8 flex w-full max-w-[700px] flex-col">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {post.frontmatter.title}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{dateLabel}</p>

        <div className="mt-8">
          <MDXRemote
            source={post.content}
            components={blogMdxComponents}
            options={{ mdxOptions: { remarkPlugins: [remarkGfm] } }}
          />
        </div>

        <div className="mt-12 flex flex-col items-center gap-3 rounded-xl border p-6 text-center">
          <p>{t("ctaText")}</p>
          <Link href="/" className={buttonVariants({ variant: "default" })}>
            {t("ctaButton")}
          </Link>
        </div>
      </article>

      <JsonLdScript
        data={getBlogPostingJsonLd({
          headline: post.frontmatter.title,
          description: post.frontmatter.description,
          datePublished: post.frontmatter.date,
          image: `${siteConfig.url}${post.frontmatter.heroImage}`,
          url: `${siteConfig.url}${path}`,
        })}
      />
      <JsonLdScript
        data={getBreadcrumbJsonLd([
          { name: t("breadcrumbHome"), url: siteConfig.url },
          {
            name: t("breadcrumbBlog"),
            url: `${siteConfig.url}${blogIndexPath(locale)}`,
          },
          { name: post.frontmatter.title, url: `${siteConfig.url}${path}` },
        ])}
      />
    </main>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manually verify in dev**

Run: `pnpm dev` (in background) then:
- `curl -s http://localhost:3000/pt/blog/username-key-whatsapp | grep -o "<title>[^<]*</title>"` — should show the article's title
- `curl -s http://localhost:3000/pt/blog/username-key-whatsapp | grep -c "BlogPosting"` — should print at least `1`
- `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/es/blog/username-key-whatsapp` — should print `404` (not translated yet)

Stop the dev server after checking.

- [ ] **Step 4: Commit**

```bash
git add app/\[locale\]/blog/\[slug\]/page.tsx
git commit -m "feat: add blog article page with SEO metadata and JSON-LD"
```

---

### Task 11: Extend the sitemap

**Files:**
- Modify: `app/sitemap.ts`

- [ ] **Step 1: Replace the file**

Replace the full contents of `app/sitemap.ts` with:

```ts
import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { routing } from "@/i18n/routing";
import { getAllPosts } from "@/lib/blog";

function localeUrl(locale: string, slug?: string) {
  const base = locale === routing.defaultLocale ? siteConfig.url : `${siteConfig.url}/${locale}`;
  return slug ? `${base}/${slug}` : base;
}

function entries(slug?: string, priority = 0.8) {
  const languages = Object.fromEntries(
    routing.locales.map((locale) => [locale, localeUrl(locale, slug)]),
  );

  return routing.locales.map((locale) => ({
    url: localeUrl(locale, slug),
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: locale === routing.defaultLocale ? priority : Math.round((priority - 0.2) * 10) / 10,
    alternates: { languages },
  }));
}

function blogPostEntries(): MetadataRoute.Sitemap {
  const slugLocales = new Map<string, string[]>();

  for (const locale of routing.locales) {
    for (const post of getAllPosts(locale)) {
      const slugs = slugLocales.get(post.frontmatter.slug) ?? [];
      slugs.push(locale);
      slugLocales.set(post.frontmatter.slug, slugs);
    }
  }

  const results: MetadataRoute.Sitemap = [];

  for (const [slug, locales] of slugLocales) {
    const languages = Object.fromEntries(
      locales.map((locale) => [locale, localeUrl(locale, `blog/${slug}`)]),
    );

    for (const locale of locales) {
      const post = getAllPosts(locale).find((p) => p.frontmatter.slug === slug);
      if (!post) continue;

      results.push({
        url: localeUrl(locale, `blog/${slug}`),
        lastModified: new Date(post.frontmatter.date),
        changeFrequency: "monthly" as const,
        priority: locale === routing.defaultLocale ? 0.6 : 0.4,
        alternates: { languages },
      });
    }
  }

  return results;
}

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ...entries(undefined, 1),
    ...entries("how-to-create-a-whatsapp-link", 0.6),
    ...entries("blog", 0.6),
    ...blogPostEntries(),
    ...entries("privacy-policy", 0.3),
    ...entries("terms-of-service", 0.3),
  ];
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manually verify the sitemap contents**

Run: `pnpm dev` (in background), then:
```bash
curl -s http://localhost:3000/sitemap.xml | grep -c "<url>"
```
Expected: previous count (from before this change) **plus** 3 (blog index × 3 locales) **plus** 5 (5 pt articles × 1 locale each, since en/es have no posts yet) = previous + 8.

Also check:
```bash
curl -s http://localhost:3000/sitemap.xml | grep -o "blog/username-key-whatsapp"
```
Expected: at least one match.

Stop the dev server after checking.

- [ ] **Step 4: Commit**

```bash
git add app/sitemap.ts
git commit -m "feat: add blog listing and article entries to sitemap"
```

---

### Task 12: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `pnpm test`
Expected: all test files PASS, including `lib/blog.test.ts` (7 tests) and `lib/json-ld.test.ts` (2 tests).

- [ ] **Step 2: Run lint**

Run: `pnpm lint`
Expected: no errors (warnings acceptable only if they already existed before this change — check with `git stash` if unsure).

- [ ] **Step 3: Run the production build**

Run: `pnpm run build`
Expected: build completes with no errors. Confirm the output lists the new routes, e.g.:
```
grep -E "blog" <(pnpm run build 2>&1)
```
should show `/blog`, `/[locale]/blog`, and `/[locale]/blog/[slug]` (or their prerendered equivalents) in the route summary.

- [ ] **Step 4: Manually smoke-test every route with the production build**

```bash
pnpm start &
sleep 3
for path in / /pt /es /how-to-create-a-whatsapp-link /pt/how-to-create-a-whatsapp-link /privacy-policy /terms-of-service /blog /pt/blog /es/blog /pt/blog/como-reservar-username-whatsapp-2026 /pt/blog/username-key-whatsapp /pt/blog/wa-me-username-alternativas /pt/blog/link-whatsapp-qr-code-gratis /pt/blog/usernames-vs-numero-telefone-privacidade /sitemap.xml; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000$path")
  echo "$path -> $code"
done
kill %1
```
Expected: every path returns `200` (the 5 `/pt/blog/{slug}` paths and `/blog`, `/pt/blog`, `/es/blog`, and all pre-existing routes).

- [ ] **Step 5: Report status**

If every check above passed, the blog feature is complete and verified. If anything failed, stop and fix it before considering this plan done — do not report success without the checks in Steps 1-4 actually passing.
