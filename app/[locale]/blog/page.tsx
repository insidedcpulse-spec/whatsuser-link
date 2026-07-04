import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { getAllPosts } from "@/lib/blog";
import { getBreadcrumbJsonLd } from "@/lib/json-ld";
import { JsonLdScript } from "@/components/json-ld-script";
import { routing } from "@/i18n/routing";
import { siteConfig } from "@/config/site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "blog" });
  const path = locale === routing.defaultLocale ? "/blog" : `/${locale}/blog`;

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

export default async function BlogIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "blog" });
  const posts = getAllPosts(locale);
  const blogPath = locale === routing.defaultLocale ? "/blog" : `/${locale}/blog`;

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-8 px-4 py-24">
      <div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{t("heading")}</h1>
        <p className="mt-4 text-muted-foreground">{t("intro")}</p>
      </div>

      {posts.length === 0 ? (
        <div className="rounded-xl border p-8 text-center">
          <p className="text-lg font-medium">{t("emptyStateTitle")}</p>
          <p className="mt-2 text-muted-foreground">{t("emptyStateBody")}</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          {posts.map((post) => (
            <Link key={post.frontmatter.slug} href={`/blog/${post.frontmatter.slug}`}>
              <Card>
                <Image
                  src={post.frontmatter.heroImage}
                  alt={post.frontmatter.heroImageAlt}
                  width={1200}
                  height={630}
                  className="w-full"
                />
                <CardHeader>
                  <CardTitle>{post.frontmatter.title}</CardTitle>
                  <CardDescription>{post.frontmatter.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    {new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(
                      new Date(post.frontmatter.date)
                    )}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <JsonLdScript
        data={getBreadcrumbJsonLd([
          { name: t("breadcrumbHome"), url: siteConfig.url },
          { name: t("breadcrumbBlog"), url: `${siteConfig.url}${blogPath}` },
        ])}
      />
    </main>
  );
}
