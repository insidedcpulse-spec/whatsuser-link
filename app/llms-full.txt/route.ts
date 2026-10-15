import { getFactLines } from "@/components/key-facts";
import { siteConfig } from "@/config/site";
import { routing } from "@/i18n/routing";
import { getAllPosts } from "@/lib/blog";

export const revalidate = 3600;

const LABEL: Record<string, string> = { en: "English", pt: "Português", es: "Español" };

function url(locale: string, p: string) {
  const base = locale === routing.defaultLocale ? siteConfig.url : `${siteConfig.url}/${locale}`;
  return `${base}${p}`;
}

/** Extended llms.txt: verifiable facts plus an index of every guide in every language. */
export async function GET() {
  const facts = (await getFactLines("en")).map((l) => `- ${l}`).join("\n");

  const guides = routing.locales
    .map((locale) => {
      const items = getAllPosts(locale)
        .map((p) => `- [${p.frontmatter.title}](${url(locale, `/blog/${p.frontmatter.slug}`)}): ${p.frontmatter.description}`)
        .join("\n");
      return `### ${LABEL[locale] ?? locale}\n${items}`;
    })
    .join("\n\n");

  const body = `# ${siteConfig.name} — full index

> Independent tool to create WhatsApp wa.me links and QR codes (free, single) and a paid bulk generator (CSV to ZIP). Not affiliated with WhatsApp or Meta.

## Verifiable facts
${facts}

## Key pages
- [Link and QR generator](${siteConfig.url}/): free WhatsApp username and phone link generator with QR download.
- [Bulk generator](${siteConfig.url}/bulk): CSV to ZIP of wa.me links and QR codes, one-time $4.99 USD.
- [Facts](${siteConfig.url}/facts): the numbers above on a human-readable page.
- [Developers](${siteConfig.url}/developers): public REST API, OpenAPI 3.1 at ${siteConfig.url}/api/v1/openapi.json, MCP at ${siteConfig.url}/api/mcp.
- [Glossary](${siteConfig.url}/glossary): wa.me, Username Key, BSUID and related terms.

## Guides by language
${guides}
`;

  return new Response(body, { headers: { "Content-Type": "text/markdown; charset=utf-8" } });
}
