import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { API_RATE_LIMITS, BULK_FACTS, getSiteFacts, MCP_TOOLS } from "@/lib/facts";

/** Plain-text, verifiable facts. Numbers are computed from the code or real counters. */
export async function getFactLines(locale: string): Promise<string[]> {
  const t = await getTranslations({ locale, namespace: "facts" });
  const f = await getSiteFacts();
  const lines = [t("launched")];

  if (f.usage) {
    lines.push(
      t("usage", { date: f.asOf, links: f.usage.links, api: f.usage.apiRequests, clients: f.usage.apiClients })
    );
  }
  lines.push(
    t("content", {
      languages: f.languages,
      articles: f.articlesPerLanguage,
      total: f.articlesPerLanguage * f.languages,
      terms: f.glossaryTerms,
      countries: f.countries,
    }),
    t("qr"),
    t("api", { endpoints: f.apiEndpoints, json: API_RATE_LIMITS.json, qr: API_RATE_LIMITS.qr }),
    t("mcp", { tools: f.mcpTools, names: MCP_TOOLS.join(", ") }),
    t("sdk"),
    t("bulk", {
      rows: BULK_FACTS.maxRows,
      px: BULK_FACTS.pngPixels,
      price: BULK_FACTS.priceUsd,
      downloads: BULK_FACTS.downloads,
      hours: BULK_FACTS.hours,
    }),
    t("privacy")
  );
  return lines;
}

export async function KeyFacts({ locale, linkToAll = false }: { locale: string; linkToAll?: boolean }) {
  const t = await getTranslations({ locale, namespace: "facts" });
  const lines = await getFactLines(locale);

  return (
    <section className="w-full max-w-3xl" aria-labelledby="key-facts-title">
      <h2 id="key-facts-title" className="mb-3 text-xl font-semibold">{t("homeTitle")}</h2>
      <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      {linkToAll && (
        <p className="mt-3 text-sm">
          <Link href="/facts" className="font-medium underline underline-offset-2">
            {t("more")} →
          </Link>
        </p>
      )}
    </section>
  );
}
