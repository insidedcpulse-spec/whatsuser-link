import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { routing } from "@/i18n/routing";
import { getAllPosts } from "@/lib/blog";
import { getAllEntities } from "@/lib/entities";

function localeUrl(locale: string, slug?: string) {
  const base = locale === routing.defaultLocale ? siteConfig.url : `${siteConfig.url}/${locale}`;
  return slug ? `${base}/${slug}` : base;
}

function entries(slug?: string, priority = 0.8) {
  const languages = Object.fromEntries([
    ...routing.locales.map((locale) => [locale, localeUrl(locale, slug)]),
    ["x-default", localeUrl(routing.defaultLocale, slug)],
  ]);

  return routing.locales.map((locale) => ({
    url: localeUrl(locale, slug),
    changeFrequency: "weekly" as const,
    priority: locale === routing.defaultLocale ? priority : Math.round((priority - 0.2) * 10) / 10,
    alternates: { languages },
  }));
}

function blogPostEntries(): MetadataRoute.Sitemap {
  const slugLocales = new Map<string, string[]>();

  for (const locale of routing.locales) {
    for (const post of getAllPosts(locale)) {
      const slugs = slugLocales.get(post.frontmatter.slug) ?? [];
      slugs.push(locale);
      slugLocales.set(post.frontmatter.slug, slugs);
    }
  }

  const results: MetadataRoute.Sitemap = [];

  for (const [slug, locales] of slugLocales) {
    const languages = Object.fromEntries([
      ...locales.map((locale) => [locale, localeUrl(locale, `blog/${slug}`)]),
      ...(locales.includes(routing.defaultLocale)
        ? [["x-default", localeUrl(routing.defaultLocale, `blog/${slug}`)]]
        : []),
    ]);

    for (const locale of locales) {
      const post = getAllPosts(locale).find((p) => p.frontmatter.slug === slug);
      if (!post) continue;

      results.push({
        url: localeUrl(locale, `blog/${slug}`),
        lastModified: new Date(post.frontmatter.date),
        changeFrequency: "monthly" as const,
        priority: locale === routing.defaultLocale ? 0.6 : 0.4,
        alternates: { languages },
      });
    }
  }

  return results;
}

function glossaryTermEntries(): MetadataRoute.Sitemap {
  const results: MetadataRoute.Sitemap = [];

  for (const entity of getAllEntities(routing.defaultLocale)) {
    const languages = Object.fromEntries([
      ...routing.locales.map((locale) => [locale, localeUrl(locale, `glossary/${entity.id}`)]),
      ["x-default", localeUrl(routing.defaultLocale, `glossary/${entity.id}`)],
    ]);

    for (const locale of routing.locales) {
      results.push({
        url: localeUrl(locale, `glossary/${entity.id}`),
        lastModified: entity.lastUpdated ? new Date(entity.lastUpdated) : undefined,
        changeFrequency: "monthly" as const,
        priority: locale === routing.defaultLocale ? 0.6 : 0.4,
        alternates: { languages },
      });
    }
  }

  return results;
}

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ...entries(undefined, 1),
    ...entries("how-to-create-a-whatsapp-link", 0.6),
    ...entries("developers", 0.6),
    ...entries("blog", 0.6),
    ...blogPostEntries(),
    ...entries("glossary", 0.6),
    ...glossaryTermEntries(),
    ...entries("about", 0.5),
    ...entries("contact", 0.5),
    ...entries("privacy-policy", 0.3),
    ...entries("terms-of-service", 0.3),
  ];
}
