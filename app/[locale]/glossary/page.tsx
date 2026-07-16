import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { getAllEntities, getChildren } from "@/lib/entities";
import { getBreadcrumbJsonLd } from "@/lib/json-ld";
import { JsonLdScript } from "@/components/json-ld-script";
import { routing } from "@/i18n/routing";
import { siteConfig } from "@/config/site";

function glossaryPath(locale: string) {
  return locale === routing.defaultLocale ? "/glossary" : `/${locale}/glossary`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "glossary" });
  const path = glossaryPath(locale);

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

function TermCard({ id, name, definition }: { id: string; name: string; definition: string }) {
  return (
    <Link href={`/glossary/${id}`}>
      <Card className="h-full transition-colors hover:border-foreground/30">
        <CardHeader>
          <CardTitle>{name}</CardTitle>
          <CardDescription>{definition}</CardDescription>
        </CardHeader>
      </Card>
    </Link>
  );
}

export default async function GlossaryIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "glossary" });
  const path = glossaryPath(locale);

  const all = getAllEntities(locale);
  const hub = all.find((entity) => entity.id === "usernames");
  const hubChildren = getChildren("usernames", locale).sort((a, b) => a.name.localeCompare(b.name));
  const otherTerms = all
    .filter((entity) => entity.parent === null && entity.id !== "usernames")
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-10 px-4 py-24">
      <div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{t("heading")}</h1>
        <p className="mt-4 text-muted-foreground">{t("intro")}</p>
      </div>

      {hub && (
        <div>
          <h2 className="mb-2 text-xl font-semibold">{t("hubHeading")}</h2>
          <p className="mb-4 text-sm text-muted-foreground">{hub.description}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {hubChildren.map((entity) => (
              <TermCard key={entity.id} id={entity.id} name={entity.name} definition={entity.definition} />
            ))}
          </div>
        </div>
      )}

      {otherTerms.length > 0 && (
        <div>
          <h2 className="mb-4 text-xl font-semibold">{t("otherHeading")}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {otherTerms.map((entity) => (
              <TermCard key={entity.id} id={entity.id} name={entity.name} definition={entity.definition} />
            ))}
          </div>
        </div>
      )}

      <JsonLdScript
        data={getBreadcrumbJsonLd([
          { name: t("breadcrumbHome"), url: siteConfig.url },
          { name: t("breadcrumbGlossary"), url: `${siteConfig.url}${path}` },
        ])}
      />
    </main>
  );
}
