import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { JsonLdScript } from "@/components/json-ld-script";
import { buttonVariants } from "@/components/ui/button";
import { getHowToJsonLd, type HowToStep } from "@/lib/json-ld";
import { routing } from "@/i18n/routing";
import { siteConfig } from "@/config/site";

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
  const steps = t.raw("steps") as HowToStep[];

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 px-4 py-24">
      <div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{t("title")}</h1>
        <p className="mt-4 text-muted-foreground">{t("intro")}</p>
      </div>

      <div>
        <h2 className="mb-4 text-xl font-semibold">{t("stepsHeading")}</h2>
        <ol className="flex flex-col gap-4">
          {steps.map((step, index) => (
            <li key={step.title} className="rounded-lg border p-4">
              <p className="font-medium">
                {index + 1}. {step.title}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
            </li>
          ))}
        </ol>
      </div>

      <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4">
        <p className="font-medium">{t("noteHeading")}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t("note")}</p>
      </div>

      <div className="flex flex-col items-center gap-3 text-center">
        <p>{t("ctaText")}</p>
        <Link href="/" className={buttonVariants({ variant: "default" })}>
          {t("ctaButton")}
        </Link>
      </div>

      <JsonLdScript data={getHowToJsonLd(t("title"), steps)} />
    </main>
  );
}
