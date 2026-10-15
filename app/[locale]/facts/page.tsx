import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { JsonLdScript } from "@/components/json-ld-script";
import { getFactLines } from "@/components/key-facts";
import { siteConfig } from "@/config/site";
import { routing } from "@/i18n/routing";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "facts" });
  const path = locale === routing.defaultLocale ? "/facts" : `/${locale}/facts`;
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: { canonical: path },
    openGraph: { title: t("metaTitle"), description: t("metaDescription"), url: path, siteName: siteConfig.name, type: "website" },
  };
}

export default async function FactsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "facts" });
  const lines = await getFactLines(locale);
  const path = locale === routing.defaultLocale ? "/facts" : `/${locale}/facts`;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 sm:px-6 py-10 md:py-16">
      <h1 className="text-4xl font-bold tracking-tight">{t("title")}</h1>
      <p className="text-lg text-muted-foreground">{t("intro")}</p>
      <ul className="list-disc space-y-3 pl-5">
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <JsonLdScript
        data={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: t("metaTitle"),
          description: t("metaDescription"),
          url: `${siteConfig.url}${path}`,
          dateModified: new Date().toISOString().slice(0, 10),
          inLanguage: locale,
          mainEntity: { "@type": "ItemList", itemListElement: lines.map((text, i) => ({ "@type": "ListItem", position: i + 1, name: text })) },
        }}
      />
    </main>
  );
}
