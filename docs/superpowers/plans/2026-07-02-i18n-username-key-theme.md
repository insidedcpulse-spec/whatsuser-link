# WhatsUser.link v2 Implementation Plan (i18n, Username Key, WhatsApp Theme)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add English/Portuguese/Spanish i18n with automatic locale detection, an optional WhatsApp "Username Key" field end-to-end, a WhatsApp-green visual theme, and an honest non-affiliation disclaimer — on top of the existing WhatsUser.link MVP.

**Architecture:** Introduce `app/[locale]/` routing via `next-intl` (path-prefix locales, Accept-Language negotiation, geo fallback in middleware). Refactor `validateUsername`/`createWhatsAppLink` to return translation-key error codes instead of hardcoded Portuguese strings. Add a new `validateUsernameKey` validator and thread `usernameKey` through `GeneratedLink`. Swap the shadcn neutral theme's `--primary` for WhatsApp green in `globals.css`.

**Tech Stack:** Next.js 15 (App Router), next-intl, existing shadcn/ui + Tailwind + Vitest stack.

**Project directory:** `/root/whatsuser-link`. Working directly on `master` (per prior agreement, no separate branch). Full spec: `docs/superpowers/specs/2026-07-02-i18n-username-key-theme-design.md`.

---

### Task 1: Username validation returns translation keys, not PT strings

**Files:**
- Modify: `utils/validate-username.ts`
- Modify: `utils/validate-username.test.ts`

- [ ] **Step 1: Update the test to expect translation keys**

Replace the full contents of `utils/validate-username.test.ts` with:

```ts
import { describe, expect, it } from "vitest";
import { sanitizeUsernameInput, validateUsername } from "@/utils/validate-username";

describe("sanitizeUsernameInput", () => {
  it("removes leading @", () => {
    expect(sanitizeUsernameInput("@joao.silva")).toBe("joao.silva");
  });

  it("removes spaces", () => {
    expect(sanitizeUsernameInput("joao silva")).toBe("joaosilva");
  });

  it("lowercases input", () => {
    expect(sanitizeUsernameInput("JoaoSilva")).toBe("joaosilva");
  });

  it("strips invalid characters", () => {
    expect(sanitizeUsernameInput("joao!silva#123")).toBe("joaosilva123");
  });
});

describe("validateUsername", () => {
  it("rejects a username with 2 characters", () => {
    const result = validateUsername("ab");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("errors.length");
  });

  it("accepts a username with 3 characters", () => {
    expect(validateUsername("abc").valid).toBe(true);
  });

  it("accepts a username with 35 characters", () => {
    expect(validateUsername("a".repeat(35)).valid).toBe(true);
  });

  it("rejects a username with 36 characters", () => {
    const result = validateUsername("a".repeat(36));
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("errors.length");
  });

  it("rejects a username starting with www.", () => {
    const result = validateUsername("www.joao");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("errors.startsWithWww");
  });

  it("rejects a username ending in a domain suffix", () => {
    const result = validateUsername("joaosilva.com");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("errors.reservedDomain");
  });

  it("rejects a username with only digits", () => {
    const result = validateUsername("123456");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("errors.noLetter");
  });

  it("rejects a username with only symbols", () => {
    const result = validateUsername("..___..");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("errors.noLetter");
  });

  it("accepts a valid alphanumeric username with dot and underscore", () => {
    expect(validateUsername("joao.silva_99").valid).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd /root/whatsuser-link
pnpm test
```

Expected: FAIL — the 5 `.toContain("errors....")` assertions fail because the current implementation still returns Portuguese sentences.

- [ ] **Step 3: Update the implementation to return keys**

Replace the full contents of `utils/validate-username.ts` with:

```ts
import type { UsernameValidationResult } from "@/types/whatsapp";

const MIN_LENGTH = 3;
const MAX_LENGTH = 35;
const ALLOWED_CHARS_REGEX = /^[a-z0-9._]*$/;
const HAS_LETTER_REGEX = /[a-z]/;
const RESERVED_DOMAIN_SUFFIXES = [".com", ".net", ".org", ".io", ".co", ".app"];

export function sanitizeUsernameInput(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/^@+/, "")
    .replace(/\s+/g, "")
    .split("")
    .filter((char) => /[a-z0-9._]/.test(char))
    .join("");
}

export function validateUsername(username: string): UsernameValidationResult {
  const errors: string[] = [];

  if (username.length < MIN_LENGTH || username.length > MAX_LENGTH) {
    errors.push("errors.length");
  }

  if (!ALLOWED_CHARS_REGEX.test(username)) {
    errors.push("errors.invalidChars");
  }

  if (!HAS_LETTER_REGEX.test(username)) {
    errors.push("errors.noLetter");
  }

  if (username.startsWith("www.")) {
    errors.push("errors.startsWithWww");
  }

  if (RESERVED_DOMAIN_SUFFIXES.some((suffix) => username.endsWith(suffix))) {
    errors.push("errors.reservedDomain");
  }

  return { valid: errors.length === 0, errors };
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
pnpm test
```

Expected: PASS — 13/13 tests in this file green.

- [ ] **Step 5: Commit**

```bash
git add utils/validate-username.ts utils/validate-username.test.ts
git commit -m "refactor: validateUsername returns translation keys instead of PT strings"
```

---

### Task 2: Username Key validation (new)

**Files:**
- Create: `utils/validate-username-key.ts`
- Test: `utils/validate-username-key.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { validateUsernameKey } from "@/utils/validate-username-key";

describe("validateUsernameKey", () => {
  it("accepts a 4-character alphanumeric key", () => {
    expect(validateUsernameKey("4821").valid).toBe(true);
  });

  it("accepts an 8-character alphanumeric key", () => {
    expect(validateUsernameKey("ab12cd34").valid).toBe(true);
  });

  it("rejects a 3-character key", () => {
    const result = validateUsernameKey("482");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("keyErrors.invalidFormat");
  });

  it("rejects a 9-character key", () => {
    const result = validateUsernameKey("123456789");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("keyErrors.invalidFormat");
  });

  it("rejects a key with symbols", () => {
    const result = validateUsernameKey("12-34");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("keyErrors.invalidFormat");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
pnpm test
```

Expected: FAIL — `utils/validate-username-key.ts` does not exist yet.

- [ ] **Step 3: Implement `utils/validate-username-key.ts`**

```ts
import type { UsernameValidationResult } from "@/types/whatsapp";

const KEY_REGEX = /^[a-z0-9]{4,8}$/i;

export function validateUsernameKey(key: string): UsernameValidationResult {
  const errors: string[] = [];

  if (!KEY_REGEX.test(key)) {
    errors.push("keyErrors.invalidFormat");
  }

  return { valid: errors.length === 0, errors };
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
pnpm test
```

Expected: PASS — 5/5 tests in this file green.

- [ ] **Step 5: Commit**

```bash
git add utils/validate-username-key.ts utils/validate-username-key.test.ts
git commit -m "feat: add Username Key validation"
```

---

### Task 3: Extend shared types with usernameKey

**Files:**
- Modify: `types/whatsapp.ts`

- [ ] **Step 1: Add `usernameKey` to `GeneratedLink`**

Replace the full contents of `types/whatsapp.ts` with:

```ts
export interface UsernameValidationResult {
  valid: boolean;
  errors: string[];
}

export interface GeneratedLink {
  url: string;
  username: string;
  usernameKey?: string;
  message?: string;
}
```

- [ ] **Step 2: Type-check**

```bash
pnpm exec tsc --noEmit
```

Expected: errors — `services/link-service.ts` still uses the old `LinkGenerationResult` shape and `UsernameValidationResult` import that Task 4 will fix. This is expected at this point; do not fix it here.

- [ ] **Step 3: Commit**

```bash
git add types/whatsapp.ts
git commit -m "feat: add optional usernameKey to GeneratedLink"
```

---

### Task 4: Link service — new signature, combined error list, key validation

**Files:**
- Modify: `services/link-service.ts`
- Modify: `services/link-service.test.ts`

- [ ] **Step 1: Update the test for the new signature and error shape**

Replace the full contents of `services/link-service.test.ts` with:

```ts
import { describe, expect, it } from "vitest";
import { createWhatsAppLink } from "@/services/link-service";

describe("createWhatsAppLink", () => {
  it("returns a generated link for a valid username without a key", () => {
    const result = createWhatsAppLink("joao.silva", undefined, "Olá!");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.link.url).toBe("https://wa.me/u/joao.silva?text=Ol%C3%A1!");
      expect(result.link.usernameKey).toBeUndefined();
    }
  });

  it("returns a generated link including the username key when valid", () => {
    const result = createWhatsAppLink("joao.silva", "4821");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.link.usernameKey).toBe("4821");
    }
  });

  it("returns validation errors for an invalid username", () => {
    const result = createWhatsAppLink("ab");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors).toContain("errors.length");
    }
  });

  it("returns validation errors for an invalid username key", () => {
    const result = createWhatsAppLink("joao.silva", "12");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors).toContain("keyErrors.invalidFormat");
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
pnpm test
```

Expected: FAIL — `createWhatsAppLink` still takes `(username, message?)`, not `(username, usernameKey?, message?)`, and `result.errors` doesn't exist yet (old shape is `result.validation.errors`).

- [ ] **Step 3: Implement the new `services/link-service.ts`**

Replace the full contents of `services/link-service.ts` with:

```ts
import { generateWhatsAppLink } from "@/lib/whatsapp/generateLink";
import { validateUsername } from "@/utils/validate-username";
import { validateUsernameKey } from "@/utils/validate-username-key";
import type { GeneratedLink } from "@/types/whatsapp";

export type LinkGenerationResult =
  | { success: true; link: GeneratedLink }
  | { success: false; errors: string[] };

export function createWhatsAppLink(
  username: string,
  usernameKey?: string,
  message?: string
): LinkGenerationResult {
  const usernameValidation = validateUsername(username);
  const keyValidation = usernameKey
    ? validateUsernameKey(usernameKey)
    : { valid: true, errors: [] as string[] };

  const errors = [...usernameValidation.errors, ...keyValidation.errors];

  if (errors.length > 0) {
    return { success: false, errors };
  }

  const url = generateWhatsAppLink(username, message);

  return {
    success: true,
    link: {
      url,
      username,
      usernameKey: usernameKey?.trim() || undefined,
      message: message?.trim() || undefined,
    },
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
pnpm test
```

Expected: PASS — all tests across the whole suite pass again (note: `components/whatsapp/username-generator.tsx` still calls the old 2-arg signature and will fail type-check until Task 14 — that's expected and fixed there).

- [ ] **Step 5: Commit**

```bash
git add services/link-service.ts services/link-service.test.ts
git commit -m "refactor: link-service supports usernameKey and combined error list"
```

---

### Task 5: Install and configure next-intl

**Files:**
- Create: `i18n/routing.ts`
- Create: `i18n/request.ts`
- Create: `i18n/navigation.ts`
- Create: `middleware.ts`
- Modify: `next.config.ts`

- [ ] **Step 1: Install next-intl**

```bash
cd /root/whatsuser-link
pnpm add next-intl
```

- [ ] **Step 2: Create `i18n/routing.ts`**

```ts
import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "pt", "es"],
  defaultLocale: "en",
  localePrefix: "as-needed",
});
```

- [ ] **Step 3: Create `i18n/navigation.ts`**

```ts
import { createNavigation } from "next-intl/navigation";
import { routing } from "@/i18n/routing";

export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
```

- [ ] **Step 4: Create `i18n/request.ts`**

```ts
import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing } from "@/i18n/routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
```

- [ ] **Step 5: Create `middleware.ts`**

```ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

const intlMiddleware = createMiddleware(routing);

/**
 * Non-exhaustive by design (MVP): only covers Portugal and the largest
 * Spanish-speaking countries. Everything else falls back to English.
 */
const GEO_LOCALE_MAP: Record<string, string> = {
  PT: "pt",
  ES: "es",
  MX: "es",
  AR: "es",
  CO: "es",
  CL: "es",
  PE: "es",
  VE: "es",
};

export default function middleware(request: NextRequest) {
  const hasAcceptLanguage = Boolean(request.headers.get("accept-language"));
  const hasLocaleCookie = Boolean(request.cookies.get("NEXT_LOCALE"));
  const alreadyHasLocalePrefix = routing.locales.some(
    (locale) =>
      request.nextUrl.pathname === `/${locale}` ||
      request.nextUrl.pathname.startsWith(`/${locale}/`)
  );

  if (!hasAcceptLanguage && !hasLocaleCookie && !alreadyHasLocalePrefix) {
    const country = request.headers.get("x-vercel-ip-country");
    const geoLocale = country ? GEO_LOCALE_MAP[country] : undefined;

    if (geoLocale && geoLocale !== routing.defaultLocale) {
      const url = request.nextUrl.clone();
      url.pathname = `/${geoLocale}${request.nextUrl.pathname}`;
      return NextResponse.redirect(url);
    }
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
```

- [ ] **Step 6: Wrap `next.config.ts` with the next-intl plugin**

Replace the full contents of `next.config.ts` with:

```ts
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  /* config options here */
};

export default withNextIntl(nextConfig);
```

- [ ] **Step 7: Commit**

```bash
git add i18n/routing.ts i18n/navigation.ts i18n/request.ts middleware.ts next.config.ts package.json pnpm-lock.yaml
git commit -m "feat: configure next-intl routing, middleware, and request config"
```

(This task only adds infrastructure — nothing consumes it yet, so there's nothing to smoke-test until Task 7 restructures the routes.)

---

### Task 6: Translation message files (en, pt, es)

**Files:**
- Create: `messages/en.json`
- Create: `messages/pt.json`
- Create: `messages/es.json`

- [ ] **Step 1: Create `messages/en.json`**

```json
{
  "hero": {
    "title": "Create WhatsApp Username Link",
    "subtitle": "Create a shareable link and QR code for your WhatsApp Username in seconds. Simple, fast, and free."
  },
  "form": {
    "usernameLabel": "WhatsApp Username",
    "usernamePlaceholder": "@username",
    "keyLabel": "Username Key (optional)",
    "keyPlaceholder": "e.g. 4821",
    "keyHint": "If you've set a Username Key in WhatsApp, add it here so people can share it together with your username.",
    "messageLabel": "Message (optional)",
    "messagePlaceholder": "Hi! I'd like to get in touch.",
    "submit": "Generate Link"
  },
  "result": {
    "usernameLabel": "Username",
    "keyLabel": "Username Key",
    "copyButton": "Copy",
    "openButton": "Open",
    "copySuccess": "Copied!",
    "copyError": "Couldn't copy. Copy it manually.",
    "downloadQr": "Download QR Code (PNG)",
    "resetButton": "Generate a new link",
    "formatNote": "WhatsApp hasn't published an official link format for usernames yet. To reach this person, open WhatsApp and search for the username above (and the key, if provided)."
  },
  "errors": {
    "length": "Must be between 3 and 35 characters.",
    "invalidChars": "Only lowercase letters, numbers, dots, and underscores are allowed.",
    "noLetter": "Must contain at least one letter.",
    "startsWithWww": "Cannot start with \"www.\".",
    "reservedDomain": "Cannot end like a domain (e.g. .com, .net)."
  },
  "keyErrors": {
    "invalidFormat": "Must be 4 to 8 letters or numbers."
  },
  "footer": {
    "disclaimer": "WhatsUser.link is not affiliated with, endorsed by, or associated with WhatsApp Inc. or Meta."
  },
  "metadata": {
    "description": "Create a shareable link and QR code for your WhatsApp Username in seconds. Simple, fast, and free."
  },
  "common": {
    "themeToggleLabel": "Toggle theme"
  }
}
```

- [ ] **Step 2: Create `messages/pt.json`**

```json
{
  "hero": {
    "title": "Cria o Link do teu WhatsApp Username",
    "subtitle": "Cria um link e QR code partilhável para o teu WhatsApp Username em segundos. Simples, rápido e gratuito."
  },
  "form": {
    "usernameLabel": "WhatsApp Username",
    "usernamePlaceholder": "@username",
    "keyLabel": "Username Key (opcional)",
    "keyPlaceholder": "ex: 4821",
    "keyHint": "Se definiste uma Username Key na WhatsApp, adiciona-a aqui para partilhares as duas coisas juntas.",
    "messageLabel": "Mensagem (opcional)",
    "messagePlaceholder": "Olá! Gostava de falar contigo.",
    "submit": "Gerar Link"
  },
  "result": {
    "usernameLabel": "Username",
    "keyLabel": "Username Key",
    "copyButton": "Copiar",
    "openButton": "Abrir",
    "copySuccess": "Copiado!",
    "copyError": "Não foi possível copiar. Copia manualmente.",
    "downloadQr": "Descarregar QR Code (PNG)",
    "resetButton": "Gerar novo link",
    "formatNote": "A WhatsApp ainda não publicou um formato oficial de link para usernames. Para contactar esta pessoa, abre a WhatsApp e pesquisa o username acima (e a key, se preenchida)."
  },
  "errors": {
    "length": "Deve ter entre 3 e 35 caracteres.",
    "invalidChars": "Só letras minúsculas, números, pontos e underscores são permitidos.",
    "noLetter": "Deve conter pelo menos uma letra.",
    "startsWithWww": "Não pode começar com \"www.\".",
    "reservedDomain": "Não pode terminar como um domínio (ex: .com, .net)."
  },
  "keyErrors": {
    "invalidFormat": "Deve ter entre 4 e 8 letras ou números."
  },
  "footer": {
    "disclaimer": "WhatsUser.link não é afiliado, endossado ou associado à WhatsApp Inc. ou Meta."
  },
  "metadata": {
    "description": "Cria um link e QR code partilhável para o teu WhatsApp Username em segundos. Simples, rápido e gratuito."
  },
  "common": {
    "themeToggleLabel": "Alternar tema"
  }
}
```

- [ ] **Step 3: Create `messages/es.json`**

```json
{
  "hero": {
    "title": "Crea el Enlace de tu WhatsApp Username",
    "subtitle": "Crea un enlace y código QR para compartir tu WhatsApp Username en segundos. Simple, rápido y gratis."
  },
  "form": {
    "usernameLabel": "WhatsApp Username",
    "usernamePlaceholder": "@username",
    "keyLabel": "Username Key (opcional)",
    "keyPlaceholder": "ej: 4821",
    "keyHint": "Si configuraste una Username Key en WhatsApp, añádela aquí para compartir ambas cosas juntas.",
    "messageLabel": "Mensaje (opcional)",
    "messagePlaceholder": "¡Hola! Me gustaría hablar contigo.",
    "submit": "Generar Enlace"
  },
  "result": {
    "usernameLabel": "Username",
    "keyLabel": "Username Key",
    "copyButton": "Copiar",
    "openButton": "Abrir",
    "copySuccess": "¡Copiado!",
    "copyError": "No se pudo copiar. Cópialo manualmente.",
    "downloadQr": "Descargar código QR (PNG)",
    "resetButton": "Generar nuevo enlace",
    "formatNote": "WhatsApp aún no ha publicado un formato oficial de enlace para usernames. Para contactar a esta persona, abre WhatsApp y busca el username de arriba (y la key, si se indicó)."
  },
  "errors": {
    "length": "Debe tener entre 3 y 35 caracteres.",
    "invalidChars": "Solo se permiten letras minúsculas, números, puntos y guiones bajos.",
    "noLetter": "Debe contener al menos una letra.",
    "startsWithWww": "No puede empezar con \"www.\".",
    "reservedDomain": "No puede terminar como un dominio (ej: .com, .net)."
  },
  "keyErrors": {
    "invalidFormat": "Debe tener entre 4 y 8 letras o números."
  },
  "footer": {
    "disclaimer": "WhatsUser.link no está afiliado, respaldado ni asociado con WhatsApp Inc. o Meta."
  },
  "metadata": {
    "description": "Crea un enlace y código QR para compartir tu WhatsApp Username en segundos. Simple, rápido y gratis."
  },
  "common": {
    "themeToggleLabel": "Cambiar tema"
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add messages/en.json messages/pt.json messages/es.json
git commit -m "feat: add EN/PT/ES translation message files"
```

---

### Task 7: Restructure routes into app/[locale]/

**Files:**
- Create: `app/[locale]/layout.tsx`
- Create: `app/[locale]/page.tsx`
- Delete: `app/layout.tsx`
- Delete: `app/page.tsx`

- [ ] **Step 1: Create `app/[locale]/layout.tsx`**

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { Toaster } from "@/components/ui/sonner";
import { routing } from "@/i18n/routing";
import { siteConfig } from "@/config/site";
import "../globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });

  return {
    metadataBase: new URL(siteConfig.url),
    title: siteConfig.name,
    description: t("description"),
    alternates: {
      canonical: "/",
    },
    openGraph: {
      title: siteConfig.name,
      description: t("description"),
      url: siteConfig.url,
      siteName: siteConfig.name,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: siteConfig.name,
      description: t("description"),
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <NextIntlClientProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <div className="fixed right-4 top-4 flex items-center gap-2">
              <LocaleSwitcher />
              <ThemeToggle />
            </div>
            {children}
            <Toaster />
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Create `app/[locale]/page.tsx`**

```tsx
import { getTranslations } from "next-intl/server";
import { Hero } from "@/components/hero";
import { UsernameGenerator } from "@/components/whatsapp/username-generator";

export default async function Home() {
  const t = await getTranslations("footer");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-12 px-4 py-24">
      <Hero />
      <div className="w-full max-w-md">
        <UsernameGenerator />
      </div>
      <p className="max-w-md text-center text-xs text-muted-foreground">{t("disclaimer")}</p>
    </main>
  );
}
```

- [ ] **Step 3: Delete the old root layout and page**

```bash
rm app/layout.tsx app/page.tsx
```

- [ ] **Step 4: Commit**

(This will not build yet — `components/locale-switcher.tsx` doesn't exist until Task 12, and `components/hero.tsx` / `username-generator.tsx` / `link-result.tsx` still use hardcoded strings and the old `createWhatsAppLink` signature until Tasks 10, 14, 15. Commit anyway to keep history granular; the working tree becomes green again once those tasks land.)

```bash
git add app/
git commit -m "refactor: move routes under app/[locale]/ for i18n"
```

---

### Task 8: Simplify site config (description moves to translations)

**Files:**
- Modify: `config/site.ts`

- [ ] **Step 1: Remove the hardcoded description**

Replace the full contents of `config/site.ts` with:

```ts
export const siteConfig = {
  name: "WhatsUser.link",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
} as const;
```

- [ ] **Step 2: Commit**

```bash
git add config/site.ts
git commit -m "refactor: move site description out of config into translations"
```

---

### Task 9: WhatsApp green theme

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Swap the light-mode primary color**

In `app/globals.css`, find this line inside the `:root` block:

```css
  --primary: oklch(0.205 0 0);
```

Replace it with:

```css
  --primary: #25d366;
```

- [ ] **Step 2: Swap the dark-mode primary color**

In `app/globals.css`, find this line inside the `.dark` block:

```css
  --primary: oklch(0.922 0 0);
```

Replace it with:

```css
  --primary: #00a884;
```

- [ ] **Step 3: Verify the build still compiles CSS correctly**

```bash
pnpm exec tsc --noEmit
```

Expected: no new errors introduced by this CSS-only change (existing errors from Task 7's incomplete component wiring are still expected at this point).

- [ ] **Step 4: Commit**

```bash
git add app/globals.css
git commit -m "feat: apply WhatsApp green as the primary accent color"
```

---

### Task 10: Hero uses translations

**Files:**
- Modify: `components/hero.tsx`

- [ ] **Step 1: Replace hardcoded strings with `useTranslations`**

Replace the full contents of `components/hero.tsx` with:

```tsx
import { useTranslations } from "next-intl";

export function Hero() {
  const t = useTranslations("hero");

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{t("title")}</h1>
      <p className="max-w-lg text-lg text-muted-foreground">{t("subtitle")}</p>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/hero.tsx
git commit -m "feat: translate hero section"
```

---

### Task 11: Theme toggle uses translated aria-label

**Files:**
- Modify: `components/theme-toggle.tsx`

- [ ] **Step 1: Replace the hardcoded aria-label**

Replace the full contents of `components/theme-toggle.tsx` with:

```tsx
"use client";

import { Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const t = useTranslations("common");
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      aria-label={t("themeToggleLabel")}
    >
      <Sun className="h-5 w-5 dark:hidden" />
      <Moon className="hidden h-5 w-5 dark:block" />
    </Button>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/theme-toggle.tsx
git commit -m "feat: translate theme toggle aria-label"
```

---

### Task 12: Locale switcher (new)

**Files:**
- Create: `components/locale-switcher.tsx`

- [ ] **Step 1: Implement the component**

```tsx
"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { Button } from "@/components/ui/button";

export function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="flex items-center gap-1">
      {routing.locales.map((loc) => (
        <Button
          key={loc}
          variant={loc === locale ? "secondary" : "ghost"}
          size="sm"
          onClick={() => router.replace(pathname, { locale: loc })}
        >
          {loc.toUpperCase()}
        </Button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
pnpm exec tsc --noEmit
```

Expected: no errors from this file (whole-project errors from `username-generator.tsx`/`link-result.tsx` still pending until Tasks 14/15).

- [ ] **Step 3: Commit**

```bash
git add components/locale-switcher.tsx
git commit -m "feat: add locale switcher"
```

---

### Task 13: QR code display accepts a translated download label

**Files:**
- Modify: `components/whatsapp/qr-code-display.tsx`

- [ ] **Step 1: Add a `downloadLabel` prop instead of hardcoding the button text**

Replace the full contents of `components/whatsapp/qr-code-display.tsx` with:

```tsx
"use client";

import { useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Button } from "@/components/ui/button";

interface QrCodeDisplayProps {
  value: string;
  downloadLabel: string;
}

export function QrCodeDisplay({ value, downloadLabel }: QrCodeDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  function handleDownload() {
    const canvas = containerRef.current?.querySelector("canvas");
    if (!canvas) return;

    const link = document.createElement("a");
    link.download = "whatsuser-link-qrcode.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div ref={containerRef} className="rounded-2xl border border-border bg-white p-4">
        <QRCodeCanvas value={value} size={200} />
      </div>
      <Button variant="outline" onClick={handleDownload}>
        {downloadLabel}
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/whatsapp/qr-code-display.tsx
git commit -m "feat: make QR download button label translatable"
```

(Note: this intentionally breaks the call site in `link-result.tsx` until Task 15 updates it — expected, fixed there.)

---

### Task 14: Username generator — translations + Username Key field

**Files:**
- Modify: `components/whatsapp/username-generator.tsx`

- [ ] **Step 1: Replace the full contents**

```tsx
"use client";

import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LinkResult } from "@/components/whatsapp/link-result";
import { createWhatsAppLink } from "@/services/link-service";
import { sanitizeUsernameInput } from "@/utils/validate-username";
import type { GeneratedLink } from "@/types/whatsapp";

export function UsernameGenerator() {
  const t = useTranslations("form");
  const tErrors = useTranslations("errors");
  const tKeyErrors = useTranslations("keyErrors");

  const [username, setUsername] = useState("");
  const [usernameKey, setUsernameKey] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [link, setLink] = useState<GeneratedLink | null>(null);

  function handleUsernameChange(event: ChangeEvent<HTMLInputElement>) {
    setUsername(sanitizeUsernameInput(event.target.value));
  }

  function translateError(key: string): string {
    if (key.startsWith("errors.")) {
      return tErrors(key.replace("errors.", ""));
    }
    return tKeyErrors(key.replace("keyErrors.", ""));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const result = createWhatsAppLink(username, usernameKey, message);

    if (!result.success) {
      setErrors(result.errors);
      setLink(null);
      return;
    }

    setErrors([]);
    setLink(result.link);
  }

  function handleReset() {
    setLink(null);
    setUsername("");
    setUsernameKey("");
    setMessage("");
    setErrors([]);
  }

  if (link) {
    return <LinkResult link={link} onReset={handleReset} />;
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-6 rounded-2xl border border-border bg-card p-8"
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="username">{t("usernameLabel")}</Label>
        <Input
          id="username"
          value={username}
          onChange={handleUsernameChange}
          placeholder={t("usernamePlaceholder")}
          maxLength={35}
        />
        {errors.length > 0 && (
          <ul className="flex flex-col gap-1 text-sm text-destructive">
            {errors.map((error) => (
              <li key={error}>{translateError(error)}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="usernameKey">{t("keyLabel")}</Label>
        <Input
          id="usernameKey"
          value={usernameKey}
          onChange={(event) => setUsernameKey(event.target.value)}
          placeholder={t("keyPlaceholder")}
          maxLength={8}
        />
        <p className="text-xs text-muted-foreground">{t("keyHint")}</p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="message">{t("messageLabel")}</Label>
        <Input
          id="message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder={t("messagePlaceholder")}
        />
      </div>

      <Button type="submit" size="lg">
        {t("submit")}
      </Button>
    </form>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/whatsapp/username-generator.tsx
git commit -m "feat: add Username Key field and translate the generator form"
```

(Still won't build — `link-result.tsx` doesn't accept the new `QrCodeDisplay` prop or show the key yet. Fixed in Task 15.)

---

### Task 15: Link result panel — translations + Username Key display

**Files:**
- Modify: `components/whatsapp/link-result.tsx`

- [ ] **Step 1: Replace the full contents**

```tsx
"use client";

import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { QrCodeDisplay } from "@/components/whatsapp/qr-code-display";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import type { GeneratedLink } from "@/types/whatsapp";

interface LinkResultProps {
  link: GeneratedLink;
  onReset: () => void;
}

export function LinkResult({ link, onReset }: LinkResultProps) {
  const t = useTranslations("result");
  const { copy } = useCopyToClipboard();

  async function handleCopy(text: string) {
    const success = await copy(text);
    if (success) {
      toast.success(t("copySuccess"));
    } else {
      toast.error(t("copyError"));
    }
  }

  return (
    <div className="flex flex-col items-center gap-6 rounded-2xl border border-border bg-card p-8 text-center">
      <div className="flex w-full flex-col gap-3">
        <div className="flex items-center justify-between gap-3 rounded-lg bg-muted px-4 py-3">
          <div className="text-left">
            <p className="text-xs text-muted-foreground">{t("usernameLabel")}</p>
            <p className="font-mono text-sm break-all">{link.username}</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => handleCopy(link.username)}>
            {t("copyButton")}
          </Button>
        </div>

        {link.usernameKey && (
          <div className="flex items-center justify-between gap-3 rounded-lg bg-muted px-4 py-3">
            <div className="text-left">
              <p className="text-xs text-muted-foreground">{t("keyLabel")}</p>
              <p className="font-mono text-sm break-all">{link.usernameKey}</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => handleCopy(link.usernameKey!)}>
              {t("copyButton")}
            </Button>
          </div>
        )}
      </div>

      <p className="max-w-md text-xs text-muted-foreground">{t("formatNote")}</p>

      <p className="break-all rounded-lg bg-muted px-4 py-3 font-mono text-sm">{link.url}</p>

      <div className="flex flex-wrap justify-center gap-3">
        <Button onClick={() => handleCopy(link.url)}>{t("copyButton")}</Button>
        <Button
          variant="outline"
          render={
            <a href={link.url} target="_blank" rel="noopener noreferrer">
              {t("openButton")}
            </a>
          }
        />
      </div>

      <QrCodeDisplay value={link.url} downloadLabel={t("downloadQr")} />

      <Button variant="ghost" onClick={onReset}>
        {t("resetButton")}
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/whatsapp/link-result.tsx
git commit -m "feat: show Username Key in result panel and translate copy"
```

---

### Task 16: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

```bash
cd /root/whatsuser-link
pnpm test
```

Expected: all tests pass (validate-username, validate-username-key, generateLink, link-service).

- [ ] **Step 2: Type-check the whole project**

```bash
pnpm exec tsc --noEmit
```

Expected: no errors, no `any` anywhere.

- [ ] **Step 3: Lint**

```bash
pnpm lint
```

Expected: no errors.

- [ ] **Step 4: Production build**

```bash
pnpm build
```

Expected: build succeeds, static params generated for `en`, `pt`, `es`.

- [ ] **Step 5: Restart the dev server and smoke-test all three locales**

```bash
pkill -f "next dev" 2>/dev/null
pkill -f "next-server" 2>/dev/null
sleep 1
nohup pnpm dev --hostname 0.0.0.0 --port 3000 > /tmp/whatsuser-dev.log 2>&1 &
disown
sleep 5
curl -s -o /dev/null -w "root: %{http_code}\n" http://localhost:3000
curl -s -o /dev/null -w "pt: %{http_code}\n" http://localhost:3000/pt
curl -s -o /dev/null -w "es: %{http_code}\n" http://localhost:3000/es
curl -s http://localhost:3000 | grep -o "Create WhatsApp Username Link"
curl -s http://localhost:3000/pt | grep -o "Cria o Link do teu WhatsApp Username"
curl -s http://localhost:3000/es | grep -o "Crea el Enlace de tu WhatsApp Username"
```

Expected: all three HTTP 200, each grep finds its localized title.

- [ ] **Step 6: Verify Accept-Language negotiation (no path prefix, no cookie)**

```bash
curl -s -H "Accept-Language: pt" http://localhost:3000 -L | grep -o "Cria o Link do teu WhatsApp Username"
curl -s -H "Accept-Language: es" http://localhost:3000 -L | grep -o "Crea el Enlace de tu WhatsApp Username"
```

Expected: both greps find the localized title (next-intl middleware redirected to `/pt` or `/es`).

- [ ] **Step 7: Verify the WhatsApp green theme is applied**

```bash
curl -s http://localhost:3000 | grep -o "#25d366"
```

Expected: found in the inlined CSS variables.

- [ ] **Step 8: Verify the disclaimer footer and Username Key field are present**

```bash
curl -s http://localhost:3000 | grep -o "not affiliated with"
curl -s http://localhost:3000 | grep -o "Username Key"
```

Expected: both found.

- [ ] **Step 9: Manual browser check**

Open `http://<server-ip>:3000` (and `/pt`, `/es`) in a real browser and verify:
- Locale switcher (EN/PT/ES buttons) changes the page language and updates the URL prefix.
- Manually switching locale persists on reload (cookie).
- Primary buttons/accents render in WhatsApp green, in both light and dark mode.
- Filling username + a 4-8 char Username Key + message and submitting shows username, key, URL, QR, and the honest "search manually" note — each with its own working copy button.
- Submitting an invalid key (e.g. 2 chars) shows a translated inline error.
- Resetting returns to the empty form.

Stop the dev server (`Ctrl+C` or `pkill -f "next dev"`) once verified.

- [ ] **Step 10: Final commit (only if fixes were needed)**

```bash
git add -A
git commit -m "fix: address issues found during v2 smoke test"
```

(Skip if no fixes were needed.)
