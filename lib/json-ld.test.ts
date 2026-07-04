import { describe, expect, it } from "vitest";
import { getBlogPostingJsonLd, getBreadcrumbJsonLd } from "@/lib/json-ld";

describe("getBlogPostingJsonLd", () => {
  it("builds a BlogPosting schema with the given fields", () => {
    const result = getBlogPostingJsonLd({
      headline: "Title",
      description: "Description",
      datePublished: "2026-01-01",
      image: "https://whatsusernames.link/blog/slug/hero.svg",
      url: "https://whatsusernames.link/blog/slug",
    });

    expect(result["@type"]).toBe("BlogPosting");
    expect(result.headline).toBe("Title");
    expect(result.datePublished).toBe("2026-01-01");
    expect(result.author).toEqual({ "@type": "Organization", name: "WhatsUser.link" });
  });
});

describe("getBreadcrumbJsonLd", () => {
  it("builds an ordered BreadcrumbList", () => {
    const result = getBreadcrumbJsonLd([
      { name: "Home", url: "https://whatsusernames.link" },
      { name: "Blog", url: "https://whatsusernames.link/blog" },
    ]);

    expect(result["@type"]).toBe("BreadcrumbList");
    expect(result.itemListElement).toEqual([
      { "@type": "ListItem", position: 1, name: "Home", item: "https://whatsusernames.link" },
      { "@type": "ListItem", position: 2, name: "Blog", item: "https://whatsusernames.link/blog" },
    ]);
  });
});
