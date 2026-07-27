import { getAllPosts } from "@/lib/blog";
import { siteConfig } from "@/config/site";

export async function GET(): Promise<Response> {
  const posts = getAllPosts("en");
  const siteUrl = siteConfig.url;

  const itemsXml = posts
    .map((post) => {
      const postUrl = `${siteUrl}/blog/${post.frontmatter.slug}`;
      const pubDate = new Date(post.frontmatter.date).toUTCString();

      return `    <item>
      <title><![CDATA[${post.frontmatter.title}]]></title>
      <link>${postUrl}</link>
      <guid isPermaLink="true">${postUrl}</guid>
      <pubDate>${pubDate}</pubDate>
      <description><![CDATA[${post.frontmatter.description}]]></description>
    </item>`;
    })
    .join("\n");

  const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>WhatsUsernames.link — Blog &amp; Developer Guides</title>
    <link>${siteUrl}</link>
    <description>Articles and technical guides on WhatsApp usernames, wa.me links, REST API integration, and privacy.</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${siteUrl}/rss.xml" rel="self" type="application/rss+xml"/>
${itemsXml}
  </channel>
</rss>`;

  return new Response(rssXml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
