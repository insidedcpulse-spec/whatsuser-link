import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { JsonLdScript } from "@/components/json-ld-script";
import { BulkTool } from "@/components/bulk/bulk-tool";
import { siteConfig } from "@/config/site";
import { routing } from "@/i18n/routing";
import { getBulkToolJsonLd, getFaqJsonLd, getHowToJsonLd, type FaqItem } from "@/lib/json-ld";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "bulk" });
  const path = locale === routing.defaultLocale ? "/bulk" : `/${locale}/bulk`;
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: { canonical: path },
    openGraph: { title: t("metaTitle"), description: t("metaDescription"), url: path, siteName: siteConfig.name, type: "website" },
  };
}

export default async function BulkPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { locale } = await params;
  const { session_id } = await searchParams;
  const t = await getTranslations({ locale, namespace: "bulk" });
  const steps = t.raw("steps") as string[];
  const faq = t.raw("faq") as FaqItem[];
  const useCases = t.raw("useCases") as string[];
  const path = locale === routing.defaultLocale ? "/bulk" : `/${locale}/bulk`;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 sm:px-6 py-10 md:py-16">
      <header className="flex flex-col gap-3 text-center">
        <h1 className="text-4xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-lg text-muted-foreground">{t("subtitle")}</p>
      </header>
      {session_id && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 p-3 text-center text-sm">
          {t("paid")}
        </p>
      )}
      <BulkTool sessionId={session_id} />
      <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
        {steps.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ol>

      <section className="flex flex-col gap-3">
        <h2 className="text-2xl font-bold tracking-tight">{t("useCasesTitle")}</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          {useCases.map((u) => (
            <li key={u}>{u}</li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-2xl font-bold tracking-tight">{t("faqTitle")}</h2>
        <div className="flex flex-col gap-2">
          {faq.map((item) => (
            <details key={item.question} className="rounded-lg border p-4">
              <summary className="cursor-pointer font-medium">{item.question}</summary>
              <p className="mt-2 text-sm text-muted-foreground">{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <JsonLdScript data={getFaqJsonLd(faq)} />
      <JsonLdScript data={getHowToJsonLd(t("title"), steps.map((d, i) => ({ title: `${i + 1}`, description: d })))} />
      <JsonLdScript data={getBulkToolJsonLd({ name: t("title"), description: t("metaDescription"), url: `${siteConfig.url}${path}` })} />
    </main>
  );
}
