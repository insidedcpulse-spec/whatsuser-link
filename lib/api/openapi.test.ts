import { describe, expect, it } from "vitest";
import { openApiDocument } from "@/lib/api/openapi";

describe("openApiDocument", () => {
  it("declares OpenAPI 3.1 and all twelve v1 paths", () => {
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
        "/api/v1/business/bsuid/validate",
        "/api/v1/business/bsuid/parse",
        "/api/v1/business/username/validate",
        "/api/v1/business/contact/resolve",
        "/api/v1/business/webhook/normalize",
      ].sort(),
    );
  });

  it("is JSON-serializable", () => {
    expect(() => JSON.stringify(openApiDocument)).not.toThrow();
  });

  it("every path has a get or post operation with at least one 200 response", () => {
    for (const [path, item] of Object.entries(openApiDocument.paths)) {
      const operation = item.get ?? item.post;
      expect(operation, `${path} missing get/post`).toBeDefined();
      expect(operation!.responses["200"], `${path} missing 200`).toBeDefined();
    }
  });

  it("every business POST path declares a JSON request body", () => {
    const businessPaths = [
      "/api/v1/business/bsuid/validate",
      "/api/v1/business/bsuid/parse",
      "/api/v1/business/username/validate",
      "/api/v1/business/contact/resolve",
      "/api/v1/business/webhook/normalize",
    ];
    for (const path of businessPaths) {
      const post = openApiDocument.paths[path].post;
      expect(post, `${path} missing post`).toBeDefined();
      expect(post!.requestBody, `${path} missing requestBody`).toBeDefined();
    }
  });
});
