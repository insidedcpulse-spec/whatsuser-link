import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { JsonLdScript } from "@/components/json-ld-script";
import { buttonVariants } from "@/components/ui/button";
import { getAllEntities, getEntity, getRelatedEntities } from "@/lib/entities";
import { getPost } from "@/lib/blog";
import {
  getDefinedTermJsonLd,
  getFaqJsonLd,
  getBreadcrumbJsonLd,
} from "@/lib/json-ld";
import { routing } from "@/i18n/routing";
import { siteConfig } from "@/config/site";

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    getAllEntities(locale).map((entity) => ({ locale, id: entity.id }))
  );
}

function termPath(locale: string, id: string) {
  return locale === routing.defaultLocale ? `/glossary/${id}` : `/${locale}/glossary/${id}`;
}

function glossaryIndexPath(locale: string) {
  return locale === routing.defaultLocale ? "/glossary" : `/${locale}/glossary`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  const entity = getEntity(id, locale);

  if (!entity) {
    return {};
  }

  const path = termPath(locale, id);
  const title = `${entity.name} — ${siteConfig.name} Glossary`;

  return {
    title,
    description: entity.definition,
    alternates: { canonical: path },
    openGraph: {
      title,
      description: entity.definition,
      url: path,
      siteName: siteConfig.name,
      type: "website",
    },
  };
}

export default async function GlossaryTermPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const entity = getEntity(id, locale);

  if (!entity) {
    notFound();
  }

  const t = await getTranslations({ locale, namespace: "glossary" });
  const path = termPath(locale, id);
  const related = getRelatedEntities(id, locale);

  const articleLinks = entity.articles
    .map((slug) => (getPost(locale, slug) ? { href: `/blog/${slug}`, label: t("readArticle") } : null))
    .filter((link): link is { href: string; label: string } => link !== null);

  const guideLinks = entity.guides.map((href) => ({ href, label: t("openGuide") }));

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 px-4 py-24">
      <div>
        <Link
          href="/glossary"
          className="text-sm text-muted-foreground underline underline-offset-4"
        >
          {t("backToGlossary")}
        </Link>
        <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">{entity.name}</h1>
        <p className="mt-3 text-lg text-muted-foreground">{entity.definition}</p>
        <p className="mt-4">{entity.description}</p>
        {entity.lastUpdated && (
          <p className="mt-4 text-xs text-muted-foreground">
            {t("lastUpdated")}{" "}
            {new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(
              new Date(entity.lastUpdated)
            )}
          </p>
        )}
      </div>

      {(articleLinks.length > 0 || guideLinks.length > 0) && (
        <div className="flex flex-wrap gap-3">
          {[...articleLinks, ...guideLinks].map((link) => (
            <Link key={link.href} href={link.href} className={buttonVariants({ variant: "outline" })}>
              {link.label}
            </Link>
          ))}
        </div>
      )}

      {entity.faqs.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">{t("faqHeading")}</h2>
          <dl className="flex flex-col gap-2">
            {entity.faqs.map((faq) => (
              <details key={faq.q} className="rounded-lg border p-4">
                <summary className="cursor-pointer font-medium">{faq.q}</summary>
                <p className="mt-2 text-sm text-muted-foreground">{faq.a}</p>
              </details>
            ))}
          </dl>
        </div>
      )}

      {related.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">{t("relatedHeading")}</h2>
          <ul className="flex flex-wrap gap-2">
            {related.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/glossary/${r.id}`}
                  className="inline-block rounded-full border px-3 py-1 text-sm text-muted-foreground hover:text-foreground"
                >
                  {r.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <JsonLdScript
        data={getDefinedTermJsonLd({
          name: entity.name,
          description: entity.description,
          url: `${siteConfig.url}${path}`,
          inDefinedTermSet: `${siteConfig.url}${glossaryIndexPath(locale)}`,
        })}
      />
      {entity.faqs.length > 0 && (
        <JsonLdScript
          data={getFaqJsonLd(entity.faqs.map((faq) => ({ question: faq.q, answer: faq.a })))}
        />
      )}
      <JsonLdScript
        data={getBreadcrumbJsonLd([
          { name: t("breadcrumbHome"), url: siteConfig.url },
          { name: t("breadcrumbGlossary"), url: `${siteConfig.url}${glossaryIndexPath(locale)}` },
          { name: entity.name, url: `${siteConfig.url}${path}` },
        ])}
      />
    </main>
  );
}
