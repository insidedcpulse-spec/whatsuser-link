import { describe, expect, it } from "vitest";
import { buildShortLink } from "@/lib/short-link";
import { siteConfig } from "@/config/site";

describe("buildShortLink", () => {
  it("appends the username to the site URL", () => {
    expect(buildShortLink("joao.silva")).toBe(
      `${siteConfig.url}/joao.silva`
    );
  });

  it("never produces a double slash even if siteConfig.url has a trailing slash", () => {
    expect(buildShortLink("ana")).not.toContain("//ana");
  });
});
