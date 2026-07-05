import { describe, expect, it } from "vitest";
import { openApiDocument } from "@/lib/api/openapi";

describe("openApiDocument", () => {
  it("declares OpenAPI 3.1 and all seven v1 paths", () => {
    expect(openApiDocument.openapi).toBe("3.1.0");
    const paths = Object.keys(openApiDocument.paths);
    expect(paths.sort()).toEqual(
      [
        "/api/v1/username-link",
        "/api/v1/phone-link",
        "/api/v1/validate/username",
        "/api/v1/validate/key",
        "/api/v1/validate/phone",
        "/api/v1/qr",
        "/api/v1/openapi.json",
      ].sort(),
    );
  });

  it("is JSON-serializable", () => {
    expect(() => JSON.stringify(openApiDocument)).not.toThrow();
  });

  it("every path has a get operation with at least one 200 response", () => {
    for (const [path, item] of Object.entries(openApiDocument.paths)) {
      expect(item.get, `${path} missing get`).toBeDefined();
      expect(item.get.responses["200"], `${path} missing 200`).toBeDefined();
    }
  });
});
