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

  it("finds all Portuguese articles including baseline set", () => {
    const slugs = getPostSlugs("pt");
    const baseline = [
      "api-whatsapp-link-gratis",
      "api-whatsapp-business-bsuid",
      "whatsusernames-sdk-npm",
      "como-reservar-username-whatsapp-2026",
      "username-key-whatsapp",
      "wa-me-username-alternativas",
      "link-whatsapp-qr-code-gratis",
      "usernames-vs-numero-telefone-privacidade",
      "nova-burla-whatsapp-anexos-falsos-malware",
      "whatsapp-backup-sem-icloud-iphone",
      "whatsapp-username-rollout-2026-guide",
      "whatsapp-link-instagram-bio-2026",
      "melhores-geradores-link-whatsapp-2026",
      "mcp-server-agentes-ia-whatsapp",
      "wame-username-vs-wame-phone-2026",
    ];
    for (const b of baseline) {
      expect(slugs).toContain(b);
    }
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

    expect(posts.length).toBeGreaterThanOrEqual(15);
    for (let i = 0; i < posts.length - 1; i++) {
      expect(posts[i].frontmatter.date >= posts[i + 1].frontmatter.date).toBe(true);
    }
  });
});
