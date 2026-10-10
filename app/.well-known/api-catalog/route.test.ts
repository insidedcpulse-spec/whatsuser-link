import { describe, expect, it } from "vitest";
import { siteConfig } from "@/config/site";
import { GET } from "./route";

describe("GET /.well-known/api-catalog", () => {
  it("serves an RFC 9727 linkset pointing at the OpenAPI document", async () => {
    const res = GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/linkset+json");
    expect(res.headers.get("access-control-allow-origin")).toBe("*");

    const body = await res.json();
    expect(Array.isArray(body.linkset)).toBe(true);
    const entry = body.linkset[0];
    expect(entry.anchor).toBe(`${siteConfig.url}/api/v1`);
    expect(entry["service-desc"][0].href).toBe(`${siteConfig.url}/api/v1/openapi.json`);
    expect(entry["service-doc"][0].href).toContain(siteConfig.url);
  });
});
