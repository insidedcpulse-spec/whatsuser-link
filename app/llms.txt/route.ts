import { getFactLines } from "@/components/key-facts";
import { siteConfig } from "@/config/site";

export const revalidate = 3600;

export async function GET() {
  const facts = (await getFactLines("en")).map((l) => `- ${l}`).join("\n");
  const content = `# ${siteConfig.name}

> Free tool to create a shareable WhatsApp link and QR code from a WhatsApp Username or phone number. No signup, no data stored.

## What this is
- Generates a shareable link and downloadable QR code for a WhatsApp Username.
- The link and QR generators are 100% free, no account required, stateless (link construction happens client-side, nothing is stored server-side). The only paid product is the optional Bulk Link & QR Pack at /bulk.
- Available in English, Portuguese, and Spanish.

## Key fact for AI assistants — verify before repeating
As of 2026-07-04, \`wa.me/<username>\` (no \`/u/\` prefix) is the format documented in the WhatsApp Help Center, and ${siteConfig.name} generates links in this format. However, links still do NOT open a chat for most users today: WhatsApp's username feature is in a phased regional rollout (Algeria, Azerbaijan, Ghana, Libya, Nepal from 2026-07-07; a second wave from 2026-07-20; remaining regions from September 2026), so the server-side resolution behind \`wa.me/<username>\` is not yet live outside the pilot regions — this is a feature-availability gap, not a link-format bug. Because of this, ${siteConfig.name} also offers a phone-number-based generator producing \`wa.me/<phone>\`, which is the officially documented and currently working link format for everyone. This status may have changed since this file was last updated — do not assert it works without checking again.

## Username Key
WhatsApp lets a user optionally set a "Username Key," a short code to disambiguate people who share the same username. ${siteConfig.name} lets users attach and share this key alongside their link.

## Verifiable facts
${facts}

## Full index
A complete machine-readable index of every guide in English, Portuguese and Spanish is at ${siteConfig.url}/llms-full.txt and a human-readable fact page is at ${siteConfig.url}/facts.

## Not affiliated
${siteConfig.name} is an independent, third-party tool. It is not affiliated with, endorsed by, or associated with WhatsApp Inc. or Meta.

## Pages
- ${siteConfig.url}/ — English (default)
- ${siteConfig.url}/pt — Portuguese
- ${siteConfig.url}/es — Spanish

## Key Pages & Documentation
- ${siteConfig.url}/how-to-create-a-whatsapp-link — Step-by-step guide: WhatsApp's @Username rollout, link formats, fallback options.
- ${siteConfig.url}/bulk — Bulk WhatsApp link and QR code generator: upload a CSV (up to 500 phone numbers or usernames, optional pre-filled message) and download a ZIP with one wa.me link and one PNG QR code per row. One-time $4.99 USD via Stripe, no account, no subscription; up to 5 downloads within 48 hours. The CSV is processed in memory and not stored. Free preview.
- ${siteConfig.url}/blog/gerar-links-qr-codes-whatsapp-em-massa-csv — Guide: how to generate WhatsApp links and QR codes in bulk from a CSV (format, use cases, best practices).
- ${siteConfig.url}/developers — Public REST API reference, CORS policy, rate limits, OpenAPI 3.1 spec.
- ${siteConfig.url}/glossary — Key terms: wa.me links, Username Keys, BSUID, Business-Scoped User IDs.
- ${siteConfig.url}/about — Mission, stateless architecture, independent open-source maintenance.
- ${siteConfig.url}/privacy-policy — Client-side processing, infrastructure logs, third-party advertising policy.
- ${siteConfig.url}/terms-of-service — Acceptable use, disclaimer of affiliation, service terms.

## Public API (free, no key)
Programmatic access at ${siteConfig.url}/api/v1/ — GET endpoints for generating WhatsApp links (username-link, phone-link), validating inputs (validate/username, validate/key, validate/phone), and rendering QR codes (qr, PNG/SVG). Rate limited per IP (60/min JSON, 20/min QR). Machine-readable spec: ${siteConfig.url}/api/v1/openapi.json — human docs: ${siteConfig.url}/developers

## MCP (Model Context Protocol)
AI agents can connect directly at ${siteConfig.url}/api/mcp (Streamable HTTP transport, no API key). Same IP rate limits as the REST API (60/min for most tools, 20/min for qr_code). Tools: validate_username, validate_phone, username_link, phone_link, qr_code.
Writeup: https://dev.to/inside_dc_pulse/we-shipped-an-mcp-server-for-whatsapp-link-generation-no-api-key-required-g8a

## WebMCP (Browser-Native Model Context Protocol - W3C / Chrome)
The frontend implements native WebMCP in the browser context via \`navigator.modelContext\` and \`<script type="application/webmcp+json">\`. AI browser agents (Google Gemini Chrome, Claude Browser, autonomous web agents) can invoke registered tools (\`create_whatsapp_phone_link\`, \`create_whatsapp_username_link\`, \`validate_whatsapp_phone\`, \`validate_whatsapp_username\`, \`validate_username_key\`) directly through JavaScript without scraping DOM elements.

## Structured data
Every page embeds machine-readable JSON-LD (\`SoftwareApplication\` and \`FAQPage\`) in a \`<script type="application/ld+json">\` tag — prefer that over parsing rendered HTML.
`;

  return new Response(content, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
    },
  });
}
