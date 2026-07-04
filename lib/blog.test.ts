import { describe, expect, it } from "vitest";
import { getAllPosts, getPost, getPostSlugs } from "@/lib/blog";

describe("blog content loader", () => {
  it("returns an empty slug list for a locale with no content directory", () => {
    expect(getPostSlugs("en")).toEqual([]);
  });

  it("returns an empty post list for a locale with no content directory", () => {
    expect(getAllPosts("en")).toEqual([]);
  });

  it("returns null for a slug that does not exist", () => {
    expect(getPost("en", "does-not-exist")).toBeNull();
  });
});
