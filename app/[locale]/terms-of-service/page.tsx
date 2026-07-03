import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LegalContent } from "@/components/legal-content";
import { routing } from "@/i18n/routing";
import { siteConfig } from "@/config/site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "legal.terms" });
  const path =
    locale === routing.defaultLocale ? "/terms-of-service" : `/${locale}/terms-of-service`;

  return {
    title: t("title"),
    description: t("metaDescription"),
    alternates: { canonical: path },
    openGraph: {
      title: t("title"),
      description: t("metaDescription"),
      url: path,
      siteName: siteConfig.name,
      type: "website",
    },
  };
}

export default async function TermsOfServicePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "legal" });
  const tt = await getTranslations({ locale, namespace: "legal.terms" });

  return (
    <LegalContent
      title={tt("title")}
      lastUpdated={t("lastUpdated")}
      intro={tt("intro")}
      sections={tt.raw("sections")}
    />
  );
}
