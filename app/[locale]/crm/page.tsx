import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CheckoutButton } from "@/components/crm/checkout-button";
import { CrmMockup } from "@/components/crm/crm-mockup";
import { CrmPrice } from "@/components/crm/crm-price";
import { siteConfig } from "@/config/site";
import { routing } from "@/i18n/routing";

type Item = { t: string; d: string };
type Faq = { q: string; a: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "crm" });
  const path = locale === routing.defaultLocale ? "/crm" : `/${locale}/crm`;
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: { canonical: path },
    openGraph: {
      title: t("metaTitle"),
      description: t("metaDescription"),
      url: path,
      siteName: siteConfig.name,
      type: "website",
    },
  };
}

export default async function CrmPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "crm" });
  const steps = t.raw("steps") as Item[];
  const features = t.raw("features") as Item[];
  const planFeatures = t.raw("planFeatures") as string[];
  const faq = t.raw("faq") as Faq[];

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-16 px-4 sm:px-6 py-10 md:py-16">
      <section className="grid items-center gap-10 md:grid-cols-2">
        <div className="flex flex-col items-start gap-5">
          <span className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white">
            {t("badge")}
          </span>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{t("heroTitle")}</h1>
          <p className="text-lg text-muted-foreground">{t("heroSubtitle")}</p>
          <CrmPrice />
          <CheckoutButton />
        </div>
        <div className="flex justify-center">
          <CrmMockup />
        </div>
      </section>

      <section className="flex flex-col gap-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight">{t("stepsTitle")}</h2>
          <p className="mt-2 text-muted-foreground">{t("stepsSubtitle")}</p>
        </div>
        <ol className="grid gap-4 md:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s.t} className="rounded-2xl border bg-card p-5">
              <span className="flex size-8 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">
                {i + 1}
              </span>
              <h3 className="mt-3 font-semibold">{s.t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="flex flex-col gap-6">
        <h2 className="text-center text-3xl font-bold tracking-tight">{t("featuresTitle")}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.t} className="rounded-2xl border bg-card p-5">
              <h3 className="font-semibold">{f.t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col items-center gap-6">
        <h2 className="text-3xl font-bold tracking-tight">{t("pricingTitle")}</h2>
        <div className="w-full max-w-md rounded-2xl border-2 border-emerald-500 bg-card p-6 text-center shadow-md">
          <h3 className="font-semibold">{t("planName")}</h3>
          <CrmPrice className="my-4" />
          <ul className="mb-5 space-y-2 text-left text-sm">
            {planFeatures.map((f) => (
              <li key={f} className="flex gap-2">
                <span className="text-emerald-600" aria-hidden="true">✓</span>
                {f}
              </li>
            ))}
          </ul>
          <CheckoutButton className="w-full" />
          <p className="mt-4 text-xs text-muted-foreground">{t("selfService")}</p>
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-3xl flex-col gap-4">
        <h2 className="text-center text-3xl font-bold tracking-tight">{t("faqTitle")}</h2>
        {faq.map((f) => (
          <details key={f.q} className="rounded-xl border bg-card p-4">
            <summary className="cursor-pointer font-medium">{f.q}</summary>
            <p className="mt-2 text-sm text-muted-foreground">{f.a}</p>
          </details>
        ))}
      </section>
    </main>
  );
}
