import { describe, expect, it } from "vitest";
import { siteConfig } from "@/config/site";
import { GET } from "./route";

describe("GET /robots.txt", () => {
  it("serves text/plain with the wildcard group, AI crawlers and sitemap", async () => {
    const res = GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/plain");
    const text = await res.text();
    expect(text).toContain("User-Agent: *\nAllow: /");
    for (const bot of ["GPTBot", "ClaudeBot", "OAI-SearchBot", "CCBot", "Meta-ExternalAgent"]) {
      expect(text).toContain(`User-Agent: ${bot}\nAllow: /`);
    }
    expect(text).toContain(`Sitemap: ${siteConfig.url}/sitemap.xml`);
  });

  it("declares Content Signals inside the wildcard group", async () => {
    const text = await GET().text();
    const wildcard = text.split("\n\n")[0];
    expect(wildcard).toContain("Content-Signal: search=yes, ai-input=yes, ai-train=no");
  });
});
