import { describe, expect, it } from "vitest";
import { getAllPosts, getPost, getPostSlugs } from "@/lib/blog";

describe("blog content loader", () => {
  it("returns an empty slug list for a locale with no content directory", () => {
    expect(getPostSlugs("de")).toEqual([]);
  });

  it("returns an empty post list for a locale with no content directory", () => {
    expect(getAllPosts("de")).toEqual([]);
  });

  it("returns null for a slug that does not exist", () => {
    expect(getPost("en", "does-not-exist")).toBeNull();
  });

  it("finds all 7 Portuguese articles", () => {
    expect(getPostSlugs("pt").sort()).toEqual(
      [
        "api-whatsapp-link-gratis",
        "api-whatsapp-business-bsuid",
        "como-reservar-username-whatsapp-2026",
        "username-key-whatsapp",
        "wa-me-username-alternativas",
        "link-whatsapp-qr-code-gratis",
        "usernames-vs-numero-telefone-privacidade",
      ].sort()
    );
  });

  it("reads frontmatter for a known post", () => {
    const post = getPost("pt", "username-key-whatsapp");

    expect(post).not.toBeNull();
    expect(post?.frontmatter.title).toBe(
      "O que é a Username Key do WhatsApp e porque devias ativá-la"
    );
    expect(post?.frontmatter.heroImage).toBe("/blog/username-key-whatsapp/hero.svg");
    expect(post?.content).toContain("## O problema que a Username Key resolve");
  });

  it("sorts posts by date, most recent first", () => {
    const posts = getAllPosts("pt");

    expect(posts).toHaveLength(7);
    expect(posts.map((p) => p.frontmatter.slug).slice(0, 2).sort()).toEqual(
      ["api-whatsapp-link-gratis", "api-whatsapp-business-bsuid"].sort()
    );
    expect(posts[posts.length - 1].frontmatter.slug).toBe(
      "como-reservar-username-whatsapp-2026"
    );
  });
});
