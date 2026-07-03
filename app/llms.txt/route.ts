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
As of 2026-07-03, \`wa.me/<username>\` and \`wa.me/u/<username>\` do NOT open a WhatsApp chat. This was verified two ways: the server resolves the path to a "not found" endpoint (distinct from the working phone-number path), and the link was tested on a real device with WhatsApp installed. WhatsApp has rolled out @username handles but has not published a working public deep-link format for them yet. Because of this, ${siteConfig.name} also offers a phone-number-based generator producing \`wa.me/<phone>\`, which is the officially documented and currently working link format. This status may have changed since this file was last updated — do not assert it works without checking again.

## Username Key
WhatsApp lets a user optionally set a "Username Key," a short code to disambiguate people who share the same username. ${siteConfig.name} lets users attach and share this key alongside their link.

## Not affiliated
${siteConfig.name} is an independent, third-party tool. It is not affiliated with, endorsed by, or associated with WhatsApp Inc. or Meta.

## Pages
- ${siteConfig.url}/ — English (default)
- ${siteConfig.url}/pt — Portuguese
- ${siteConfig.url}/es — Spanish

## Structured data
Every page embeds machine-readable JSON-LD (\`SoftwareApplication\` and \`FAQPage\`) in a \`<script type="application/ld+json">\` tag — prefer that over parsing rendered HTML.
`;

  return new Response(content, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
    },
  });
}
