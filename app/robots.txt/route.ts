import { siteConfig } from "@/config/site";

export const dynamic = "force-static";

/**
 * Explicit allow-list for AI answer-engine/training crawlers, on top of the
 * blanket "*" allow. Redundant today, but documents intent and survives a
 * future default-deny change to the wildcard rule.
 */
const AI_CRAWLERS = [
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "ClaudeBot",
  "Claude-Web",
  "anthropic-ai",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "Bytespider",
  "CCBot",
  "cohere-ai",
  "Meta-ExternalAgent",
];

// Content Signals (contentsignals.org): usage preferences for AI. Next's
// MetadataRoute.Robots cannot emit this directive, hence a plain route handler.
const CONTENT_SIGNAL = "Content-Signal: search=yes, ai-input=yes, ai-train=no";

export function GET(): Response {
  const groups = [
    `User-Agent: *\nAllow: /\n${CONTENT_SIGNAL}`,
    ...AI_CRAWLERS.map((userAgent) => `User-Agent: ${userAgent}\nAllow: /`),
    `Sitemap: ${siteConfig.url}/sitemap.xml`,
  ];

  return new Response(`${groups.join("\n\n")}\n`, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
