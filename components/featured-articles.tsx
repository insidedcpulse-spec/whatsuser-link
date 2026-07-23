import { getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getAllPosts } from "@/lib/blog";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { BookOpen, ArrowRight, Calendar } from "lucide-react";

export async function FeaturedArticles() {
  const locale = await getLocale();
  const posts = getAllPosts(locale).slice(0, 4);

  if (posts.length === 0) return null;

  return (
    <section className="w-full max-w-4xl flex flex-col gap-6 py-6">
      <div className="flex items-center justify-between border-b pb-3">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-emerald-600" />
          <h2 className="text-xl font-bold tracking-tight">WhatsApp Guides & Articles</h2>
        </div>
        <Link
          href="/blog"
          className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition-colors"
        >
          View all articles
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {posts.map((post) => (
          <Card key={post.frontmatter.slug} className="hover:shadow-md transition-shadow flex flex-col justify-between">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <Calendar className="h-3 w-3" />
                <span>{post.frontmatter.date}</span>
              </div>
              <CardTitle className="text-base font-semibold line-clamp-2 hover:text-emerald-600 transition-colors">
                <Link href={`/blog/${post.frontmatter.slug}`}>
                  {post.frontmatter.title}
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <CardDescription className="text-xs line-clamp-3 leading-relaxed mb-3 text-muted-foreground">
                {post.frontmatter.description}
              </CardDescription>
              <Link
                href={`/blog/${post.frontmatter.slug}`}
                className="text-xs font-medium text-emerald-600 hover:underline inline-flex items-center gap-1"
              >
                Read article <ArrowRight className="h-3 w-3" />
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
