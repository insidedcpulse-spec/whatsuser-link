import { describe, it, expect } from "vitest";
import { GET } from "./route";

describe("app/rss.xml/route", () => {
  it("generates a valid RSS XML feed", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/xml");

    const xml = await res.text();
    expect(xml).toContain("<?xml version=\"1.0\" encoding=\"UTF-8\"?>");
    expect(xml).toContain("<title>WhatsUsernames.link — Blog &amp; Developer Guides</title>");
    expect(xml).toContain("whatsapp-username-rollout-2026-guide");
  });
});
