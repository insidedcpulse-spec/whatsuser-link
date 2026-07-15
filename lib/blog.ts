import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

export type BlogFrontmatter = {
  title: string;
  description: string;
  date: string;
  slug: string;
  heroImage: string;
  heroImageAlt: string;
  entity?: string;
};

export type BlogPost = {
  frontmatter: BlogFrontmatter;
  content: string;
};

const CONTENT_ROOT = path.join(process.cwd(), "content", "blog");

export function getPostSlugs(locale: string): string[] {
  const dir = path.join(CONTENT_ROOT, locale);

  if (!fs.existsSync(dir)) {
    return [];
  }

  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".mdx"))
    .map((file) => file.replace(/\.mdx$/, ""));
}

export function getPost(locale: string, slug: string): BlogPost | null {
  const filePath = path.join(CONTENT_ROOT, locale, `${slug}.mdx`);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  const raw = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(raw);

  return { frontmatter: data as BlogFrontmatter, content };
}

export function getAllPosts(locale: string): BlogPost[] {
  return getPostSlugs(locale)
    .map((slug) => getPost(locale, slug))
    .filter((post): post is BlogPost => post !== null)
    .sort((a, b) => (a.frontmatter.date < b.frontmatter.date ? 1 : -1));
}
