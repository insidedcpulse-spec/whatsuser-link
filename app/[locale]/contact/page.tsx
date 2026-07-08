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
  const t = await getTranslations({ locale, namespace: "contact" });
  const path = locale === routing.defaultLocale ? "/contact" : `/${locale}/contact`;

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

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "contact" });

  return <LegalContent title={t("title")} intro={t("intro")} sections={t.raw("sections")} />;
}
