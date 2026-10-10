import { describe, expect, it } from "vitest";
import { siteConfig } from "@/config/site";
import { GET } from "./route";

describe("GET /.well-known/mcp/server-card.json", () => {
  it("describes the Streamable HTTP MCP endpoint", async () => {
    const res = GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(res.headers.get("access-control-allow-origin")).toBe("*");

    const card = await res.json();
    expect(card.serverInfo).toEqual({ name: "whatsusernames-link", version: "1.0.0" });
    expect(card.transport).toEqual({
      type: "streamable-http",
      endpoint: `${siteConfig.url}/api/mcp`,
    });
    expect(card.capabilities).toEqual({ tools: {} });
    expect(card.authentication).toEqual({ required: false });
  });
});
