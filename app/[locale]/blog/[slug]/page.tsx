import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { JsonLdScript } from "@/components/json-ld-script";
import { buttonVariants } from "@/components/ui/button";
import { blogMdxComponents } from "@/components/blog/mdx-components";
import { getPost, getPostSlugs } from "@/lib/blog";
import { getBlogPostingJsonLd, getBreadcrumbJsonLd } from "@/lib/json-ld";
import { routing } from "@/i18n/routing";
import { siteConfig } from "@/config/site";

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    getPostSlugs(locale).map((slug) => ({ locale, slug }))
  );
}

function articlePath(locale: string, slug: string) {
  return locale === routing.defaultLocale ? `/blog/${slug}` : `/${locale}/blog/${slug}`;
}

function blogIndexPath(locale: string) {
  return locale === routing.defaultLocale ? "/blog" : `/${locale}/blog`;
}

// Article rich results and OG/Twitter card readers require a raster image;
// SVG hero images (used on-page, where they render crisply) aren't valid there.
// Each hero.svg ships with a hero.png twin at the same path for that purpose.
function heroImagePng(heroImage: string): string {
  return heroImage.replace(/\.svg$/, ".png");
}

function localesWithSlug(slug: string) {
  return routing.locales.filter((locale) => getPost(locale, slug) !== null);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const post = getPost(locale, slug);

  if (!post) {
    return {};
  }

  const path = articlePath(locale, slug);
  const languages = Object.fromEntries(
    localesWithSlug(slug).map((l) => [l, articlePath(l, slug)])
  );

  return {
    title: post.frontmatter.title,
    description: post.frontmatter.description,
    alternates: { canonical: path, languages },
    openGraph: {
      title: post.frontmatter.title,
      description: post.frontmatter.description,
      url: path,
      siteName: siteConfig.name,
      type: "article",
      images: [{ url: heroImagePng(post.frontmatter.heroImage) }],
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const post = getPost(locale, slug);

  if (!post) {
    notFound();
  }

  const t = await getTranslations({ locale, namespace: "blog" });
  const path = articlePath(locale, slug);
  const dateLabel = new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(
    new Date(post.frontmatter.date)
  );

  return (
    <main className="flex min-h-screen flex-col items-center px-4 py-24">
      <div className="w-full max-w-3xl">
        <Image
          src={post.frontmatter.heroImage}
          alt={post.frontmatter.heroImageAlt}
          width={1200}
          height={630}
          priority
          className="w-full rounded-xl"
        />
      </div>

      <article className="mt-8 flex w-full max-w-[700px] flex-col">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {post.frontmatter.title}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{dateLabel}</p>

        <div className="mt-8">
          <MDXRemote
            source={post.content}
            components={blogMdxComponents}
            options={{ mdxOptions: { remarkPlugins: [remarkGfm] } }}
          />
        </div>

        <div className="mt-12 flex flex-col items-center gap-3 rounded-xl border p-6 text-center">
          <p>{t("ctaText")}</p>
          <Link href="/" className={buttonVariants({ variant: "default" })}>
            {t("ctaButton")}
          </Link>
        </div>
      </article>

      <JsonLdScript
        data={getBlogPostingJsonLd({
          headline: post.frontmatter.title,
          description: post.frontmatter.description,
          datePublished: post.frontmatter.date,
          image: `${siteConfig.url}${heroImagePng(post.frontmatter.heroImage)}`,
          url: `${siteConfig.url}${path}`,
        })}
      />
      <JsonLdScript
        data={getBreadcrumbJsonLd([
          { name: t("breadcrumbHome"), url: siteConfig.url },
          {
            name: t("breadcrumbBlog"),
            url: `${siteConfig.url}${blogIndexPath(locale)}`,
          },
          { name: post.frontmatter.title, url: `${siteConfig.url}${path}` },
        ])}
      />
    </main>
  );
}
