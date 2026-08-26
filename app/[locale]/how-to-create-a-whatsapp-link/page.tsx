import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { JsonLdScript } from "@/components/json-ld-script";
import { buttonVariants } from "@/components/ui/button";
import { getHowToJsonLd, getBreadcrumbJsonLd, getFaqJsonLd, type HowToStep, type FaqItem } from "@/lib/json-ld";
import { routing } from "@/i18n/routing";
import { siteConfig } from "@/config/site";
import { Zap, CheckCircle2, HelpCircle, ArrowRight } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "guide" });
  const path =
    locale === routing.defaultLocale
      ? "/how-to-create-a-whatsapp-link"
      : `/${locale}/how-to-create-a-whatsapp-link`;

  return {
    title: t("title"),
    description: t("metaDescription"),
    alternates: { canonical: path },
    openGraph: {
      title: t("title"),
      description: t("metaDescription"),
      url: path,
      siteName: siteConfig.name,
      type: "article",
    },
  };
}

export default async function GuidePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "guide" });
  const tBlog = await getTranslations({ locale, namespace: "blog" });
  const steps = t.raw("steps") as HowToStep[];
  const extraSections = t.raw("extraSections") as { heading: string; body: string[] }[];
  const quickAnswerItems = (t.raw("quickAnswerItems") as string[]) || [];
  const faqItems = (t.raw("faqItems") as FaqItem[]) || [];

  const path =
    locale === routing.defaultLocale
      ? "/how-to-create-a-whatsapp-link"
      : `/${locale}/how-to-create-a-whatsapp-link`;

  return (
    <div className="flex min-h-screen flex-col justify-between">
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-12 md:py-16">
        <div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl text-foreground">{t("title")}</h1>
          <p className="mt-4 text-base text-muted-foreground leading-relaxed">{t("intro")}</p>
        </div>

        {/* Quick Answer / TL;DR Box for Instant Conversions and Featured Snippets */}
        <div className="rounded-2xl border-2 border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20 p-6 shadow-sm">
          <div className="flex items-center gap-2.5 text-emerald-700 dark:text-emerald-400">
            <Zap className="h-5 w-5" />
            <h2 className="text-lg font-bold">{t("quickAnswerHeading")}</h2>
          </div>
          <p className="mt-2 text-sm text-foreground/80 font-medium">
            {t("quickAnswerSub")}
          </p>
          <div className="mt-4 grid gap-3">
            {quickAnswerItems.map((item, idx) => (
              <div key={idx} className="flex items-start gap-3 bg-background/80 dark:bg-card/80 p-3 rounded-xl border border-emerald-500/20">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
                  {idx + 1}
                </span>
                <p className="text-sm text-foreground leading-relaxed">{item}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-emerald-500/20">
            <span className="text-xs text-muted-foreground">Funciona em iOS, Android e WhatsApp Web</span>
            <Link
              href="/"
              className={buttonVariants({ variant: "default", size: "sm", className: "gap-1.5" })}
            >
              <span>{t("ctaButton")}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Detailed Step-by-Step */}
        <div>
          <h2 className="mb-4 text-xl font-semibold text-foreground">{t("stepsHeading")}</h2>
          <ol className="flex flex-col gap-4">
            {steps.map((step, index) => (
              <li key={step.title} className="rounded-xl border p-4 bg-card shadow-xs">
                <p className="font-semibold text-foreground flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>{index + 1}. {step.title}</span>
                </p>
                <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed pl-6">{step.description}</p>
              </li>
            ))}
          </ol>
        </div>

        {/* Rollout Note */}
        <div className="rounded-xl border border-amber-500/50 bg-amber-500/10 p-5">
          <p className="font-semibold text-amber-950 dark:text-amber-200">{t("noteHeading")}</p>
          <p className="mt-1.5 text-sm text-amber-900/80 dark:text-amber-300/80 leading-relaxed">{t("note")}</p>
        </div>

        {/* Extra Practical Details */}
        <div>
          <h2 className="mb-4 text-xl font-semibold text-foreground">{t("extraHeading")}</h2>
          <div className="flex flex-col gap-6">
            {extraSections.map((section) => (
              <div key={section.heading} className="space-y-1.5">
                <h3 className="font-semibold text-foreground text-base">{section.heading}</h3>
                {section.body.map((paragraph, index) => (
                  <p key={index} className="text-sm text-muted-foreground leading-relaxed">
                    {paragraph}
                  </p>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* FAQ Section */}
        {faqItems.length > 0 && (
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-xl font-semibold text-foreground">{t("faqHeading")}</h2>
            </div>
            <div className="grid gap-3">
              {faqItems.map((item, idx) => (
                <div key={idx} className="rounded-xl border p-4 bg-card">
                  <h3 className="text-sm font-semibold text-foreground">{item.question}</h3>
                  <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{item.answer}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bottom CTA */}
        <div className="flex flex-col items-center gap-3 text-center my-4 py-6 px-4 rounded-2xl bg-muted/40 border">
          <p className="text-base font-semibold text-foreground">{t("ctaText")}</p>
          <Link href="/" className={buttonVariants({ variant: "default", size: "lg", className: "gap-2" })}>
            <span>{t("ctaButton")}</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* JSON-LD Schemas */}
        <JsonLdScript data={getHowToJsonLd(t("title"), steps)} />
        {faqItems.length > 0 && <JsonLdScript data={getFaqJsonLd(faqItems)} />}
        <JsonLdScript
          data={getBreadcrumbJsonLd([
            { name: tBlog("breadcrumbHome"), url: siteConfig.url },
            { name: t("title"), url: `${siteConfig.url}${path}` },
          ])}
        />
      </main>

      <SiteFooter />
    </div>
  );
}
