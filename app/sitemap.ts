import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { routing } from "@/i18n/routing";

function localeUrl(locale: string, slug?: string) {
  const base = locale === routing.defaultLocale ? siteConfig.url : `${siteConfig.url}/${locale}`;
  return slug ? `${base}/${slug}` : base;
}

function entries(slug?: string, priority = 0.8) {
  const languages = Object.fromEntries(
    routing.locales.map((locale) => [locale, localeUrl(locale, slug)]),
  );

  return routing.locales.map((locale) => ({
    url: localeUrl(locale, slug),
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: locale === routing.defaultLocale ? priority : Math.round((priority - 0.2) * 10) / 10,
    alternates: { languages },
  }));
}

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ...entries(undefined, 1),
    ...entries("how-to-create-a-whatsapp-link", 0.6),
    ...entries("privacy-policy", 0.3),
    ...entries("terms-of-service", 0.3),
  ];
}
