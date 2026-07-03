# Short Link, QR Customization, Profile Card, Copy-All Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a stateless branded short link (`whatsuser.link/<username>`), a customizable QR code (color/logo/transparency/PNG-JPEG-SVG-PDF export), a restyled "profile card" result panel, and a "copy all" button — per `docs/superpowers/specs/2026-07-03-shortlink-qr-customization-design.md`.

**Architecture:** A new Next.js Route Handler under `app/[locale]/[username]/route.ts` does a pure format-based 307 redirect to `wa.me/u/<username>` — no database, no new backend. `middleware.ts`'s static-asset exclusion regex is tightened so usernames containing dots aren't misidentified as static files, and `validate-username.ts` gains matching reserved suffixes to keep the two lists coherent. The QR code component gains client-side customization state (color, logo toggle, transparency, format) with a new `jspdf` dependency for PDF export. `link-result.tsx` computes and displays the short link instead of the raw `wa.me` URL, restyles the existing username/key block, and adds a "copy all" action.

**Tech Stack:** Next.js 15 (App Router), next-intl, qrcode.react, jspdf (new), existing shadcn/ui + Tailwind + Vitest stack.

**Project directory:** `/root/whatsuser-link`. Working directly on `master` (per prior agreement, no separate branch). Full spec: `docs/superpowers/specs/2026-07-03-shortlink-qr-customization-design.md`.

---

### Task 1: Close the static-extension gap in username validation

**Files:**
- Modify: `utils/validate-username.ts`
- Modify: `utils/validate-username.test.ts`

- [ ] **Step 1: Add the failing test**

Add this test inside the existing `describe("validateUsername", ...)` block in `utils/validate-username.test.ts`, right after the `"rejects a username ending in a domain suffix"` test:

```ts
  it("rejects a username ending in a static file extension", () => {
    const result = validateUsername("alguem.js");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("errors.reservedDomain");
  });
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd /root/whatsuser-link
pnpm test
```

Expected: FAIL — `"alguem.js"` currently passes validation because `.js` isn't in `RESERVED_DOMAIN_SUFFIXES`.

- [ ] **Step 3: Extend `RESERVED_DOMAIN_SUFFIXES`**

In `utils/validate-username.ts`, replace:

```ts
const RESERVED_DOMAIN_SUFFIXES = [".com", ".net", ".org", ".io", ".co", ".app"];
```

with:

```ts
const RESERVED_DOMAIN_SUFFIXES = [
  ".com",
  ".net",
  ".org",
  ".io",
  ".co",
  ".app",
  ".ico",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".svg",
  ".css",
  ".js",
  ".mjs",
  ".map",
  ".json",
  ".txt",
  ".xml",
  ".webmanifest",
  ".woff",
  ".woff2",
  ".ttf",
];
```

This keeps the disallowed-suffix list coherent with the static-asset extensions the middleware matcher will special-case in Task 2 — a username ending in one of these could never be reached via the short-link route anyway (the request would look like a static file request), so it must be rejected at validation time too.

- [ ] **Step 4: Run the test to verify it passes**

```bash
pnpm test
```

Expected: PASS — all tests in `utils/validate-username.test.ts` green (14/14).

- [ ] **Step 5: Commit**

```bash
git add utils/validate-username.ts utils/validate-username.test.ts
git commit -m "feat: reject usernames ending in static file extensions"
```

---

### Task 2: Fix middleware static-asset matcher for dotted usernames

**Files:**
- Modify: `middleware.ts`

- [ ] **Step 1: Tighten the matcher regex**

In `middleware.ts`, replace:

```ts
export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
```

with:

```ts
export const config = {
  matcher: [
    "/((?!api|_next|_vercel|.*\\.(?:ico|png|jpg|jpeg|gif|svg|css|js|mjs|map|json|txt|xml|webmanifest|woff|woff2|ttf)$).*)",
  ],
};
```

The previous regex excluded any path containing a dot anywhere, which would have made a short link like `/joao.silva` skip next-intl's middleware entirely (and 404, since the `[locale]` rewrite never happens). The new regex only excludes paths that *end* in a known static-file extension.

- [ ] **Step 2: Type-check**

```bash
rm -rf .next
./node_modules/.bin/tsc --noEmit
```

Expected: no errors. (Always `rm -rf .next` before type-checking after a routing-relevant change — stale generated route types otherwise produce false-positive errors, as seen in the previous round.)

- [ ] **Step 3: Commit**

```bash
git add middleware.ts
git commit -m "fix: only exclude known static-file extensions from i18n middleware"
```

---

### Task 3: Short link redirect route

**Files:**
- Create: `app/[locale]/[username]/route.ts`

- [ ] **Step 1: Create the route handler**

```ts
import { NextResponse } from "next/server";
import { validateUsername } from "@/utils/validate-username";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  const { valid } = validateUsername(username);

  if (!valid) {
    return new NextResponse("Not found", { status: 404 });
  }

  return NextResponse.redirect(`https://wa.me/u/${username}`, 307);
}
```

This lives under `[locale]/` because next-intl's middleware rewrites unprefixed (default-locale) requests to `/<defaultLocale>/<path>` internally — the route must exist at that rewritten path to match. The canonical shareable form stays unprefixed: `whatsuser.link/rf1985`.

- [ ] **Step 2: Type-check**

```bash
rm -rf .next
./node_modules/.bin/tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/
git commit -m "feat: add stateless short link redirect route"
```

(No automated test — this is pure I/O redirect behavior. Verified via curl in Task 7's final verification pass.)

---

### Task 4: Translation keys for short link, copy-all, and QR customization

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/pt.json`
- Modify: `messages/es.json`

- [ ] **Step 1: Update `messages/en.json`**

In the `"result"` object, change:

```json
    "downloadQr": "Download QR Code (PNG)",
```

to:

```json
    "downloadQr": "Download QR Code",
```

and add these two keys to the `"result"` object (after `"formatNote"`):

```json
    "copyAllButton": "Copy all",
    "shortLinkLabel": "Link"
```

Then add a new top-level `"qr"` object (after the `"footer"` object):

```json
  "qr": {
    "colorLabel": "QR color",
    "logoLabel": "Include chat icon",
    "transparentLabel": "Transparent background"
  },
```

The full `"result"` object should now read:

```json
  "result": {
    "usernameLabel": "Username",
    "keyLabel": "Username Key",
    "copyButton": "Copy",
    "openButton": "Open",
    "copySuccess": "Copied!",
    "copyError": "Couldn't copy. Copy it manually.",
    "downloadQr": "Download QR Code",
    "resetButton": "Generate a new link",
    "formatNote": "WhatsApp hasn't published an official link format for usernames yet. To reach this person, open WhatsApp and search for the username above (and the key, if provided).",
    "copyAllButton": "Copy all",
    "shortLinkLabel": "Link"
  },
```

- [ ] **Step 2: Update `messages/pt.json`**

Same edits, in Portuguese. The full `"result"` object should read:

```json
  "result": {
    "usernameLabel": "Username",
    "keyLabel": "Username Key",
    "copyButton": "Copiar",
    "openButton": "Abrir",
    "copySuccess": "Copiado!",
    "copyError": "Não foi possível copiar. Copia manualmente.",
    "downloadQr": "Descarregar QR Code",
    "resetButton": "Gerar novo link",
    "formatNote": "A WhatsApp ainda não publicou um formato oficial de link para usernames. Para contactar esta pessoa, abre a WhatsApp e pesquisa o username acima (e a key, se preenchida).",
    "copyAllButton": "Copiar tudo",
    "shortLinkLabel": "Link"
  },
```

and add the `"qr"` object:

```json
  "qr": {
    "colorLabel": "Cor do QR",
    "logoLabel": "Incluir ícone de chat",
    "transparentLabel": "Fundo transparente"
  },
```

- [ ] **Step 3: Update `messages/es.json`**

Same edits, in Spanish. The full `"result"` object should read:

```json
  "result": {
    "usernameLabel": "Username",
    "keyLabel": "Username Key",
    "copyButton": "Copiar",
    "openButton": "Abrir",
    "copySuccess": "¡Copiado!",
    "copyError": "No se pudo copiar. Cópialo manualmente.",
    "downloadQr": "Descargar código QR",
    "resetButton": "Generar nuevo enlace",
    "formatNote": "WhatsApp aún no ha publicado un formato oficial de enlace para usernames. Para contactar a esta persona, abre WhatsApp y busca el username de arriba (y la key, si se indicó).",
    "copyAllButton": "Copiar todo",
    "shortLinkLabel": "Enlace"
  },
```

and add the `"qr"` object:

```json
  "qr": {
    "colorLabel": "Color del QR",
    "logoLabel": "Incluir icono de chat",
    "transparentLabel": "Fondo transparente"
  },
```

- [ ] **Step 4: Validate JSON syntax**

```bash
for f in messages/en.json messages/pt.json messages/es.json; do
  node -e "JSON.parse(require('fs').readFileSync('$f','utf8')); console.log('$f OK')"
done
```

Expected: `OK` printed for all three files.

- [ ] **Step 5: Commit**

```bash
git add messages/en.json messages/pt.json messages/es.json
git commit -m "feat: add translation keys for short link, copy-all, and QR customization"
```

---

### Task 5: QR code customization (color, logo, transparency, PNG/JPEG/SVG/PDF export)

**Files:**
- Create: `public/chat-icon.svg`
- Modify: `components/whatsapp/qr-code-display.tsx`

- [ ] **Step 1: Install `jspdf`**

```bash
cd /root/whatsuser-link
pnpm add jspdf
```

- [ ] **Step 2: Create the generic chat-icon asset**

Create `public/chat-icon.svg` with this exact content (a generic green circle + white speech-bubble silhouette — deliberately not the official WhatsApp logo, to avoid trademark risk):

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
  <circle cx="20" cy="20" r="20" fill="#25D366"/>
  <path d="M20 10c-5.5 0-10 3.8-10 8.5 0 2.6 1.4 4.9 3.6 6.5l-1 4.3 4.4-2.3c1 .2 2 .3 3 .3 5.5 0 10-3.8 10-8.5S25.5 10 20 10z" fill="#ffffff"/>
</svg>
```

- [ ] **Step 3: Replace the full contents of `components/whatsapp/qr-code-display.tsx`**

```tsx
"use client";

import { useRef, useState } from "react";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";
import { jsPDF } from "jspdf";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type QrFormat = "png" | "jpeg" | "svg" | "pdf";

interface QrCodeDisplayProps {
  value: string;
  downloadLabel: string;
}

const QR_SIZE = 200;
const FORMATS: QrFormat[] = ["png", "jpeg", "svg", "pdf"];

export function QrCodeDisplay({ value, downloadLabel }: QrCodeDisplayProps) {
  const t = useTranslations("qr");
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const [color, setColor] = useState("#25D366");
  const [includeLogo, setIncludeLogo] = useState(false);
  const [transparent, setTransparent] = useState(false);
  const [format, setFormat] = useState<QrFormat>("png");

  const bgColor = transparent ? "transparent" : "#ffffff";
  const level = includeLogo ? "H" : "M";
  const imageSettings = includeLogo
    ? { src: "/chat-icon.svg", height: 40, width: 40, excavate: true }
    : undefined;

  function selectFormat(next: QrFormat) {
    setFormat(next);
    if (next === "jpeg") {
      setTransparent(false);
    }
  }

  function triggerDownload(href: string, filename: string) {
    const link = document.createElement("a");
    link.download = filename;
    link.href = href;
    link.click();
  }

  function handleDownload() {
    const canvas = canvasContainerRef.current?.querySelector("canvas");
    if (!canvas) return;

    if (format === "png") {
      triggerDownload(canvas.toDataURL("image/png"), "whatsuser-link-qrcode.png");
      return;
    }

    if (format === "jpeg") {
      triggerDownload(canvas.toDataURL("image/jpeg"), "whatsuser-link-qrcode.jpg");
      return;
    }

    if (format === "svg") {
      const svg = svgRef.current;
      if (!svg) return;
      const blob = new Blob([svg.outerHTML], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      triggerDownload(url, "whatsuser-link-qrcode.svg");
      URL.revokeObjectURL(url);
      return;
    }

    const doc = new jsPDF({ unit: "px", format: [QR_SIZE + 20, QR_SIZE + 20] });
    doc.addImage(canvas.toDataURL("image/png"), "PNG", 10, 10, QR_SIZE, QR_SIZE);
    doc.save("whatsuser-link-qrcode.pdf");
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        ref={canvasContainerRef}
        className="rounded-2xl border border-border p-4"
        style={{ backgroundColor: transparent ? "transparent" : "#ffffff" }}
      >
        <QRCodeCanvas
          value={value}
          size={QR_SIZE}
          fgColor={color}
          bgColor={bgColor}
          level={level}
          imageSettings={imageSettings}
        />
      </div>

      <QRCodeSVG
        ref={svgRef}
        value={value}
        size={QR_SIZE}
        fgColor={color}
        bgColor={bgColor}
        level={level}
        imageSettings={imageSettings}
        className="hidden"
      />

      <div className="flex w-full max-w-xs flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="qr-color">{t("colorLabel")}</Label>
          <input
            id="qr-color"
            type="color"
            value={color}
            onChange={(event) => setColor(event.target.value)}
            className="h-8 w-12 cursor-pointer rounded border border-border"
          />
        </div>

        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="qr-logo">{t("logoLabel")}</Label>
          <input
            id="qr-logo"
            type="checkbox"
            checked={includeLogo}
            onChange={(event) => setIncludeLogo(event.target.checked)}
          />
        </div>

        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="qr-transparent">{t("transparentLabel")}</Label>
          <input
            id="qr-transparent"
            type="checkbox"
            checked={transparent}
            disabled={format === "jpeg"}
            onChange={(event) => setTransparent(event.target.checked)}
          />
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {FORMATS.map((f) => (
          <Button
            key={f}
            type="button"
            size="sm"
            variant={format === f ? "secondary" : "outline"}
            onClick={() => selectFormat(f)}
          >
            {f.toUpperCase()}
          </Button>
        ))}
      </div>

      <Button variant="outline" onClick={handleDownload}>
        {downloadLabel}
      </Button>
    </div>
  );
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
git add public/chat-icon.svg components/whatsapp/qr-code-display.tsx package.json pnpm-lock.yaml
git commit -m "feat: add customizable QR color, logo, transparency, and multi-format export"
```

(Visual/download behavior verified manually in Task 7 — canvas/SVG rendering isn't reliably unit-testable.)

---

### Task 6: Short link display, profile-card restyle, and copy-all button

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
import { siteConfig } from "@/config/site";
import type { GeneratedLink } from "@/types/whatsapp";

interface LinkResultProps {
  link: GeneratedLink;
  onReset: () => void;
}

export function LinkResult({ link, onReset }: LinkResultProps) {
  const t = useTranslations("result");
  const { copy } = useCopyToClipboard();
  const shortUrl = `${siteConfig.url}/${link.username}`;

  async function handleCopy(text: string) {
    const success = await copy(text);
    if (success) {
      toast.success(t("copySuccess"));
    } else {
      toast.error(t("copyError"));
    }
  }

  function handleCopyAll() {
    const lines = [t("usernameLabel"), `@${link.username}`, ""];

    if (link.usernameKey) {
      lines.push(t("keyLabel"), link.usernameKey, "");
    }

    lines.push(t("shortLinkLabel"), shortUrl);

    handleCopy(lines.join("\n"));
  }

  return (
    <div className="flex flex-col items-center gap-6 rounded-2xl border border-border bg-card p-8 text-center">
      <div className="flex w-full items-center justify-between gap-3 rounded-lg bg-muted px-4 py-3">
        <div className="flex flex-col gap-1 text-left">
          <p className="text-lg font-bold break-all">@{link.username}</p>
          {link.usernameKey && (
            <p className="font-mono text-xs text-muted-foreground break-all">
              {t("keyLabel")}: {link.usernameKey}
            </p>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            handleCopy(
              link.usernameKey ? `${link.username}\n${link.usernameKey}` : link.username
            )
          }
        >
          {t("copyButton")}
        </Button>
      </div>

      <p className="max-w-md text-xs text-muted-foreground">{t("formatNote")}</p>

      <p className="break-all rounded-lg bg-muted px-4 py-3 font-mono text-sm">{shortUrl}</p>

      <div className="flex flex-wrap justify-center gap-3">
        <Button onClick={() => handleCopy(shortUrl)}>{t("copyButton")}</Button>
        <Button
          variant="outline"
          render={
            <a href={shortUrl} target="_blank" rel="noopener noreferrer">
              {t("openButton")}
            </a>
          }
        />
        <Button variant="outline" onClick={handleCopyAll}>
          {t("copyAllButton")}
        </Button>
      </div>

      <QrCodeDisplay value={link.url} downloadLabel={t("downloadQr")} />

      <Button variant="ghost" onClick={onReset}>
        {t("resetButton")}
      </Button>
    </div>
  );
}
```

Note: the QR code still encodes `link.url` (the direct `wa.me/u/...` link), not `shortUrl` — scanning it opens WhatsApp directly without depending on our own redirect route being up. Only the displayed/copied/opened link in the panel switches to the short link.

- [ ] **Step 2: Type-check**

```bash
rm -rf .next
./node_modules/.bin/tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/whatsapp/link-result.tsx
git commit -m "feat: show short link, restyle result as profile card, add copy-all"
```

---

### Task 7: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

```bash
cd /root/whatsuser-link
pnpm test
```

Expected: all tests pass, including the new static-extension test from Task 1.

- [ ] **Step 2: Type-check the whole project**

```bash
rm -rf .next
./node_modules/.bin/tsc --noEmit
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

Expected: build succeeds.

- [ ] **Step 5: Restart the live VPS test server**

Two SEPARATE commands (combining kill + start in one shell invocation has previously caused the freshly spawned process to die immediately):

```bash
pkill -9 -f "next-server"
```

Then, in a separate command:

```bash
cd /root/whatsuser-link
setsid nohup ./node_modules/.bin/next start --hostname 0.0.0.0 --port 3000 > /root/whatsuser-link/prod.log 2>&1 < /dev/null &
disown
```

Then, in a separate command, confirm it's up:

```bash
sleep 4
curl -s -o /dev/null -w "root: %{http_code}\n" http://localhost:3000
```

Expected: `root: 200`.

- [ ] **Step 6: Verify the short link redirect**

```bash
curl -s -o /dev/null -w "rf1985: %{http_code} -> %{redirect_url}\n" http://localhost:3000/rf1985
curl -s -o /dev/null -w "joao.silva: %{http_code} -> %{redirect_url}\n" http://localhost:3000/joao.silva
curl -s -o /dev/null -w "invalid-short: %{http_code}\n" http://localhost:3000/ab
```

Expected: `rf1985: 307 -> https://wa.me/u/rf1985`, `joao.silva: 307 -> https://wa.me/u/joao.silva` (confirms the middleware fix from Task 2 — a dotted username no longer 404s), `invalid-short: 404` (username too short).

- [ ] **Step 7: Verify static assets still work after the middleware matcher change**

```bash
curl -s -o /dev/null -w "favicon: %{http_code}\n" http://localhost:3000/favicon.ico
curl -s -o /dev/null -w "robots: %{http_code}\n" http://localhost:3000/robots.txt
```

Expected: both `200` — confirms the tightened matcher didn't regress static-file handling.

- [ ] **Step 8: Manual browser check**

Open `http://2.25.169.27:3000` in a real browser (or drive it with the same Playwright + `playwright-core` + system Chrome approach used in the previous round: `chromium.launch({ executablePath: '/usr/local/bin/google-chrome', args: ['--no-sandbox'] })`) and verify:
- Generating a link shows the `whatsuser.link/...`-style short link (not `wa.me/u/...`) as the main displayed/copied/opened URL.
- The username/key block reads as a compact "profile card": `@username` large and bold, key as a smaller secondary line below (when a key was provided).
- "Copy all" button copies a block containing username, key (if present), and the short link, each under its own label — verify via a toast success message and by reading `document.execCommand`/clipboard state in the driving script.
- QR code color picker changes the QR's rendered color.
- QR "include chat icon" toggle overlays the generic chat-bubble icon (from `public/chat-icon.svg`) in the center — never the official WhatsApp logo.
- QR "transparent background" toggle is disabled when JPEG format is selected, and re-enables when switching back to PNG/SVG/PDF.
- Each of the 4 download buttons (PNG, JPEG, SVG, PDF) produces a downloaded file without a console error.

Stop the dev/prod server only if requested — otherwise leave the live test deploy running for the user.

- [ ] **Step 9: Final commit (only if fixes were needed)**

```bash
git add -A
git commit -m "fix: address issues found during Fase 2 verification"
```

(Skip if no fixes were needed.)

- [ ] **Step 10: Push**

```bash
GITHUB_TOKEN= GH_TOKEN= git push origin master
```
