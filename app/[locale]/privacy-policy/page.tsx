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
  const t = await getTranslations({ locale, namespace: "legal.privacy" });
  const path =
    locale === routing.defaultLocale ? "/privacy-policy" : `/${locale}/privacy-policy`;

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

export default async function PrivacyPolicyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "legal" });
  const tp = await getTranslations({ locale, namespace: "legal.privacy" });

  return (
    <LegalContent
      title={tp("title")}
      lastUpdated={t("lastUpdated")}
      intro={tp("intro")}
      sections={tp.raw("sections")}
    />
  );
}
