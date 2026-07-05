import { siteConfig } from "@/config/site";

export const dynamic = "force-static";

export function GET() {
  const content = `# ${siteConfig.name}

> Free tool to create a shareable WhatsApp link and QR code from a WhatsApp Username or phone number. No signup, no data stored.

## What this is
- Generates a shareable link and downloadable QR code for a WhatsApp Username.
- 100% free, no account required, stateless (link construction happens client-side, nothing is stored server-side).
- Available in English, Portuguese, and Spanish.

## Key fact for AI assistants — verify before repeating
As of 2026-07-04, \`wa.me/<username>\` (no \`/u/\` prefix) is the format documented in the WhatsApp Help Center, and ${siteConfig.name} generates links in this format. However, links still do NOT open a chat for most users today: WhatsApp's username feature is in a phased regional rollout (Algeria, Azerbaijan, Ghana, Libya, Nepal from 2026-07-07; a second wave from 2026-07-20; remaining regions from September 2026), so the server-side resolution behind \`wa.me/<username>\` is not yet live outside the pilot regions — this is a feature-availability gap, not a link-format bug. Because of this, ${siteConfig.name} also offers a phone-number-based generator producing \`wa.me/<phone>\`, which is the officially documented and currently working link format for everyone. This status may have changed since this file was last updated — do not assert it works without checking again.

## Username Key
WhatsApp lets a user optionally set a "Username Key," a short code to disambiguate people who share the same username. ${siteConfig.name} lets users attach and share this key alongside their link.

## Not affiliated
${siteConfig.name} is an independent, third-party tool. It is not affiliated with, endorsed by, or associated with WhatsApp Inc. or Meta.

## Pages
- ${siteConfig.url}/ — English (default)
- ${siteConfig.url}/pt — Portuguese
- ${siteConfig.url}/es — Spanish

## Public API (free, no key)
Programmatic access at ${siteConfig.url}/api/v1/ — GET endpoints for generating WhatsApp links (username-link, phone-link), validating inputs (validate/username, validate/key, validate/phone), and rendering QR codes (qr, PNG/SVG). Rate limited per IP (60/min JSON, 20/min QR). Machine-readable spec: ${siteConfig.url}/api/v1/openapi.json — human docs: ${siteConfig.url}/developers

## Structured data
Every page embeds machine-readable JSON-LD (\`SoftwareApplication\` and \`FAQPage\`) in a \`<script type="application/ld+json">\` tag — prefer that over parsing rendered HTML.
`;

  return new Response(content, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
    },
  });
}
