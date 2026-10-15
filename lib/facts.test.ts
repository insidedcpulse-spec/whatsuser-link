import { readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getSiteFacts, MCP_TOOLS } from "./facts";

describe("site facts", () => {
  it("derives counts from the real source of truth", async () => {
    const facts = await getSiteFacts();
    expect(facts.languages).toBe(3);
    expect(facts.apiEndpoints).toBe(11);
    expect(facts.articlesPerLanguage).toBeGreaterThanOrEqual(21);
    expect(facts.countries).toBeGreaterThan(10);
    expect(facts.asOf).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("lists exactly the MCP tools that exist", () => {
    const dir = path.join(process.cwd(), "app/api/mcp/tools");
    const tools = readdirSync(dir)
      .filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts") && f !== "tool-result.ts")
      .map((f) => f.replace(/\.ts$/, "").replace(/-/g, "_"));
    expect([...MCP_TOOLS].sort()).toEqual(tools.sort());
  });

  it("keeps the same articles in every language", async () => {
    const { getPostSlugs } = await import("./blog");
    expect(getPostSlugs("pt").sort()).toEqual(getPostSlugs("en").sort());
    expect(getPostSlugs("es").sort()).toEqual(getPostSlugs("en").sort());
  });
});
