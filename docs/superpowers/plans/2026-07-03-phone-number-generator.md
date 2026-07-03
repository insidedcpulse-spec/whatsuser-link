# Phone Number Generator (Temporary Block) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a second, independent WhatsApp link generator based on phone number (country + number + message → `wa.me/<phone>?text=`, officially documented and confirmed working), displayed above the existing username generator on the home page — without modifying the username flow at all.

**Architecture:** Mirrors the existing username generator's file structure exactly (`lib/whatsapp/*`, `utils/validate-*`, `services/*-service.ts`, `components/whatsapp/*`), but as fully separate, parallel files — no shared state, no modification of `GeneratedLink`/`link-service.ts`/`generateLink.ts`/`UsernameGenerator`/`LinkResult`. The phone-number link format is officially confirmed (unlike the username format), so the result panel is simpler: no key, no "copy all", no custom short link — the raw `wa.me/<phone>` link is already the final shareable link.

**Tech Stack:** Same as rest of project — Next.js 15, next-intl, Vitest, existing shadcn/ui components (no new UI library components needed — plain native `<select>` for country, since `components/ui/select.tsx` doesn't exist and adding it would be overkill for one dropdown).

**Project directory:** `/root/whatsuser-link`. Working directly on `master` (established convention, no separate branch). Full spec: `docs/superpowers/specs/2026-07-03-phone-number-generator-design.md`.

---

### Task 1: Phone number validation (TDD)

**Files:**
- Create: `utils/validate-phone.ts`
- Create: `utils/validate-phone.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { sanitizePhoneInput, validatePhoneNumber } from "@/utils/validate-phone";

describe("sanitizePhoneInput", () => {
  it("removes spaces", () => {
    expect(sanitizePhoneInput("912 345 678")).toBe("912345678");
  });

  it("removes dashes and parentheses", () => {
    expect(sanitizePhoneInput("(912)-345-678")).toBe("912345678");
  });

  it("removes a leading plus sign", () => {
    expect(sanitizePhoneInput("+351912345678")).toBe("351912345678");
  });
});

describe("validatePhoneNumber", () => {
  it("rejects a number with 7 digits", () => {
    const result = validatePhoneNumber("1234567");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("phoneErrors.invalidFormat");
  });

  it("accepts a number with 8 digits", () => {
    expect(validatePhoneNumber("12345678").valid).toBe(true);
  });

  it("accepts a number with 15 digits", () => {
    expect(validatePhoneNumber("1".repeat(15)).valid).toBe(true);
  });

  it("rejects a number with 16 digits", () => {
    const result = validatePhoneNumber("1".repeat(16));
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("phoneErrors.invalidFormat");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd /root/whatsuser-link
pnpm test
```

Expected: FAIL — `utils/validate-phone.ts` does not exist yet.

- [ ] **Step 3: Implement `utils/validate-phone.ts`**

```ts
import type { UsernameValidationResult } from "@/types/whatsapp";

const MIN_DIGITS = 8;
const MAX_DIGITS = 15;

export function sanitizePhoneInput(raw: string): string {
  return raw.replace(/\D/g, "");
}

export function validatePhoneNumber(phone: string): UsernameValidationResult {
  const errors: string[] = [];

  if (phone.length < MIN_DIGITS || phone.length > MAX_DIGITS) {
    errors.push("phoneErrors.invalidFormat");
  }

  return { valid: errors.length === 0, errors };
}
```

(Reuses the existing `UsernameValidationResult` type shape `{ valid, errors }` — the name is historical from the username feature, but the shape is generic. Not worth renaming across the codebase just for this.)

- [ ] **Step 4: Run the test to verify it passes**

```bash
pnpm test
```

Expected: PASS — 7/7 new tests green.

- [ ] **Step 5: Commit**

```bash
git add utils/validate-phone.ts utils/validate-phone.test.ts
git commit -m "feat: add phone number validation"
```

---

### Task 2: Types, country codes, and phone link format

**Files:**
- Modify: `types/whatsapp.ts`
- Create: `lib/countryCodes.ts`
- Create: `lib/whatsapp/generatePhoneLink.ts`

- [ ] **Step 1: Add `GeneratedPhoneLink` to `types/whatsapp.ts`**

Add this to the end of `types/whatsapp.ts` (keep the existing `UsernameValidationResult` and `GeneratedLink` interfaces unchanged):

```ts

export interface GeneratedPhoneLink {
  url: string;
  phone: string;
  message?: string;
}
```

- [ ] **Step 2: Create `lib/countryCodes.ts`**

```ts
export interface CountryCode {
  code: string;
  name: string;
  dialCode: string;
}

export const COUNTRY_CODES: CountryCode[] = [
  { code: "PT", name: "Portugal", dialCode: "351" },
  { code: "BR", name: "Brasil", dialCode: "55" },
  { code: "ES", name: "España", dialCode: "34" },
  { code: "US", name: "United States", dialCode: "1" },
  { code: "GB", name: "United Kingdom", dialCode: "44" },
  { code: "FR", name: "France", dialCode: "33" },
  { code: "DE", name: "Deutschland", dialCode: "49" },
  { code: "IT", name: "Italia", dialCode: "39" },
  { code: "MX", name: "México", dialCode: "52" },
  { code: "AR", name: "Argentina", dialCode: "54" },
  { code: "CO", name: "Colombia", dialCode: "57" },
  { code: "CL", name: "Chile", dialCode: "56" },
  { code: "PE", name: "Perú", dialCode: "51" },
  { code: "VE", name: "Venezuela", dialCode: "58" },
  { code: "IN", name: "India", dialCode: "91" },
  { code: "AO", name: "Angola", dialCode: "244" },
  { code: "MZ", name: "Moçambique", dialCode: "258" },
  { code: "CV", name: "Cabo Verde", dialCode: "238" },
  { code: "CA", name: "Canada", dialCode: "1" },
  { code: "AU", name: "Australia", dialCode: "61" },
];
```

- [ ] **Step 3: Create `lib/whatsapp/generatePhoneLink.ts`**

```ts
/**
 * Formato oficialmente documentado pela WhatsApp Business Platform
 * (click-to-chat): https://wa.me/<numero>?text=<mensagem>
 * Ao contrário do formato de username em generateLink.ts, este formato
 * é confirmado e estável (Meta for Developers / WhatsApp Help Center).
 */
export function generatePhoneWhatsAppLink(phone: string, message?: string): string {
  const baseUrl = `https://wa.me/${phone}`;

  if (!message || message.trim().length === 0) {
    return baseUrl;
  }

  return `${baseUrl}?text=${encodeURIComponent(message)}`;
}
```

- [ ] **Step 4: Type-check**

```bash
rm -rf .next
./node_modules/.bin/tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add types/whatsapp.ts lib/countryCodes.ts lib/whatsapp/generatePhoneLink.ts
git commit -m "feat: add phone link format, country codes, and GeneratedPhoneLink type"
```

---

### Task 3: Phone link service (TDD)

**Files:**
- Create: `services/phone-link-service.ts`
- Create: `services/phone-link-service.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { createPhoneWhatsAppLink } from "@/services/phone-link-service";

describe("createPhoneWhatsAppLink", () => {
  it("returns a generated link for a valid phone number without a message", () => {
    const result = createPhoneWhatsAppLink("351912345678");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.link.url).toBe("https://wa.me/351912345678");
      expect(result.link.message).toBeUndefined();
    }
  });

  it("returns a generated link with an encoded message", () => {
    const result = createPhoneWhatsAppLink("351912345678", "Olá!");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.link.url).toBe("https://wa.me/351912345678?text=Ol%C3%A1!");
    }
  });

  it("returns validation errors for an invalid phone number", () => {
    const result = createPhoneWhatsAppLink("123");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors).toContain("phoneErrors.invalidFormat");
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
pnpm test
```

Expected: FAIL — `services/phone-link-service.ts` does not exist yet.

- [ ] **Step 3: Implement `services/phone-link-service.ts`**

```ts
import { generatePhoneWhatsAppLink } from "@/lib/whatsapp/generatePhoneLink";
import { validatePhoneNumber } from "@/utils/validate-phone";
import type { GeneratedPhoneLink } from "@/types/whatsapp";

export type PhoneLinkGenerationResult =
  | { success: true; link: GeneratedPhoneLink }
  | { success: false; errors: string[] };

export function createPhoneWhatsAppLink(
  phone: string,
  message?: string
): PhoneLinkGenerationResult {
  const validation = validatePhoneNumber(phone);

  if (!validation.valid) {
    return { success: false, errors: validation.errors };
  }

  const url = generatePhoneWhatsAppLink(phone, message);

  return {
    success: true,
    link: { url, phone, message: message?.trim() || undefined },
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
pnpm test
```

Expected: PASS — 3/3 new tests green, and all prior tests still passing.

- [ ] **Step 5: Commit**

```bash
git add services/phone-link-service.ts services/phone-link-service.test.ts
git commit -m "feat: add phone link generation service"
```

---

### Task 4: Translation keys for the phone generator

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/pt.json`
- Modify: `messages/es.json`

- [ ] **Step 1: Update `messages/en.json`**

Add `"sectionTitle": "Generate by Username"` to the existing `"form"` object (as its first key). Then add two new top-level namespaces, placed after the `"form"` object:

```json
  "phone": {
    "sectionTitle": "Generate by Phone Number",
    "countryLabel": "Country",
    "phoneLabel": "WhatsApp Phone Number",
    "phonePlaceholder": "912 345 678",
    "submit": "Generate Link"
  },
  "phoneErrors": {
    "invalidFormat": "Enter a valid phone number."
  },
```

- [ ] **Step 2: Update `messages/pt.json`**

Add `"sectionTitle": "Gerar por Username"` to `"form"`. Add:

```json
  "phone": {
    "sectionTitle": "Gerar por Número de Telefone",
    "countryLabel": "País",
    "phoneLabel": "Número de WhatsApp",
    "phonePlaceholder": "912 345 678",
    "submit": "Gerar Link"
  },
  "phoneErrors": {
    "invalidFormat": "Introduz um número de telefone válido."
  },
```

- [ ] **Step 3: Update `messages/es.json`**

Add `"sectionTitle": "Generar por Username"` to `"form"`. Add:

```json
  "phone": {
    "sectionTitle": "Generar por Número de Teléfono",
    "countryLabel": "País",
    "phoneLabel": "Número de WhatsApp",
    "phonePlaceholder": "912 345 678",
    "submit": "Generar Enlace"
  },
  "phoneErrors": {
    "invalidFormat": "Introduce un número de teléfono válido."
  },
```

- [ ] **Step 4: Validate JSON syntax**

```bash
cd /root/whatsuser-link
for f in messages/en.json messages/pt.json messages/es.json; do
  node -e "JSON.parse(require('fs').readFileSync('$f','utf8')); console.log('$f OK')"
done
```

Expected: `OK` for all three.

- [ ] **Step 5: Commit**

```bash
git add messages/en.json messages/pt.json messages/es.json
git commit -m "feat: add translation keys for phone number generator"
```

---

### Task 5: Phone link result panel

**Files:**
- Create: `components/whatsapp/phone-link-result.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { QrCodeDisplay } from "@/components/whatsapp/qr-code-display";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import type { GeneratedPhoneLink } from "@/types/whatsapp";

interface PhoneLinkResultProps {
  link: GeneratedPhoneLink;
  onReset: () => void;
}

export function PhoneLinkResult({ link, onReset }: PhoneLinkResultProps) {
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

This reuses translation keys already present in the `"result"` namespace (`copyButton`, `openButton`, `copySuccess`, `copyError`, `downloadQr`, `resetButton`) — no new keys needed here since they were added generically enough in earlier rounds.

- [ ] **Step 2: Type-check**

```bash
rm -rf .next
./node_modules/.bin/tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/whatsapp/phone-link-result.tsx
git commit -m "feat: add phone link result panel"
```

---

### Task 6: Phone generator form

**Files:**
- Create: `components/whatsapp/phone-generator.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneLinkResult } from "@/components/whatsapp/phone-link-result";
import { createPhoneWhatsAppLink } from "@/services/phone-link-service";
import { sanitizePhoneInput } from "@/utils/validate-phone";
import { COUNTRY_CODES } from "@/lib/countryCodes";
import type { GeneratedPhoneLink } from "@/types/whatsapp";

export function PhoneGenerator() {
  const t = useTranslations("phone");
  const tForm = useTranslations("form");
  const tPhoneErrors = useTranslations("phoneErrors");

  const [countryCode, setCountryCode] = useState(COUNTRY_CODES[0].code);
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [link, setLink] = useState<GeneratedPhoneLink | null>(null);

  function handlePhoneChange(event: ChangeEvent<HTMLInputElement>) {
    setPhone(sanitizePhoneInput(event.target.value));
  }

  function translateError(key: string): string {
    return tPhoneErrors(key.replace("phoneErrors.", ""));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const country = COUNTRY_CODES.find((c) => c.code === countryCode) ?? COUNTRY_CODES[0];
    const result = createPhoneWhatsAppLink(`${country.dialCode}${phone}`, message);

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
    setPhone("");
    setMessage("");
    setErrors([]);
  }

  if (link) {
    return <PhoneLinkResult link={link} onReset={handleReset} />;
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-6 rounded-2xl border border-border bg-card p-8"
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="country">{t("countryLabel")}</Label>
        <select
          id="country"
          value={countryCode}
          onChange={(event) => setCountryCode(event.target.value)}
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
        >
          {COUNTRY_CODES.map((country) => (
            <option key={country.code} value={country.code}>
              {country.name} (+{country.dialCode})
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="phone">{t("phoneLabel")}</Label>
        <Input
          id="phone"
          value={phone}
          onChange={handlePhoneChange}
          placeholder={t("phonePlaceholder")}
          maxLength={15}
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
        <Label htmlFor="phone-message">{tForm("messageLabel")}</Label>
        <Input
          id="phone-message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder={tForm("messagePlaceholder")}
        />
      </div>

      <Button type="submit" size="lg">
        {t("submit")}
      </Button>
    </form>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
rm -rf .next
./node_modules/.bin/tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/whatsapp/phone-generator.tsx
git commit -m "feat: add phone number generator form"
```

---

### Task 7: Wire into the home page

**Files:**
- Modify: `app/[locale]/page.tsx`

- [ ] **Step 1: Replace the full contents**

```tsx
import { getTranslations } from "next-intl/server";
import { Hero } from "@/components/hero";
import { PhoneGenerator } from "@/components/whatsapp/phone-generator";
import { UsernameGenerator } from "@/components/whatsapp/username-generator";

export default async function Home() {
  const t = await getTranslations("footer");
  const tPhone = await getTranslations("phone");
  const tForm = await getTranslations("form");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-12 px-4 py-24">
      <Hero />

      {/*
        TEMPORÁRIO: confirmámos em 2026-07-03 (servidor + telemóvel real)
        que wa.me/<username> ainda não abre conversa. Este bloco dá aos
        visitantes um link que funciona hoje. Remover quando o link de
        username for confirmado a funcionar — o gerador abaixo volta a
        ser o único/principal.
      */}
      <div className="w-full max-w-md">
        <h2 className="mb-4 text-center text-lg font-semibold">{tPhone("sectionTitle")}</h2>
        <PhoneGenerator />
      </div>

      <div className="w-full max-w-md">
        <h2 className="mb-4 text-center text-lg font-semibold">{tForm("sectionTitle")}</h2>
        <UsernameGenerator />
      </div>

      <p className="max-w-md text-center text-xs text-muted-foreground">{t("disclaimer")}</p>
    </main>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
rm -rf .next
./node_modules/.bin/tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "app/[locale]/page.tsx"
git commit -m "feat: add temporary phone-number generator block above the username generator"
```

---

### Task 8: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

```bash
cd /root/whatsuser-link
pnpm test
```

Expected: all tests pass (new phone validation + service tests, plus all prior tests unaffected).

- [ ] **Step 2: Type-check the whole project**

```bash
rm -rf .next
./node_modules/.bin/tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Lint**

```bash
pnpm lint
```

Expected: no errors.

- [ ] **Step 4: Production build**

```bash
pnpm build
```

Expected: build succeeds.

- [ ] **Step 5: Restart the live VPS test server**

Two SEPARATE commands (combining kill + start in one shell invocation has previously caused the freshly spawned process to die immediately in this project):

```bash
pkill -9 -f "next-server"
```

Then, in a separate command:

```bash
cd /root/whatsuser-link
setsid nohup ./node_modules/.bin/next start --hostname 0.0.0.0 --port 3000 > /root/whatsuser-link/prod.log 2>&1 < /dev/null &
disown
```

Then, in a separate command:

```bash
sleep 4
curl -s -o /dev/null -w "root: %{http_code}\n" http://localhost:3000
```

Expected: `root: 200`.

- [ ] **Step 6: Manual/automated browser check**

Using the established `playwright-core` + system Chrome approach (`chromium.launch({ executablePath: '/usr/local/bin/google-chrome', args: ['--no-sandbox'] })`), drive `http://2.25.169.27:3000/pt` and verify:
- Both section titles are visible, phone block first, username block second (scroll down).
- Fill the phone form (pick a country, e.g. Portugal, type a plausible number like `912345678`, optionally a message), submit — result panel shows the `wa.me/<fullnumber>` link, QR code, working copy/open buttons.
- Submitting an invalid phone number (e.g. `123`) shows the translated inline error.
- The username block below still works exactly as before (unaffected regression check) — generate a username link, confirm profile card + QR + copy-all still work.
- No console/page errors during either flow.

Take at least one screenshot as evidence.

- [ ] **Step 7: Final commit (only if fixes were needed)**

```bash
git add -A
git commit -m "fix: address issues found during phone generator verification"
```

(Skip if no fixes were needed.)

- [ ] **Step 8: Push**

```bash
GITHUB_TOKEN= GH_TOKEN= git push origin master
```
