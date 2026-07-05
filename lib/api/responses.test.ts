import { describe, expect, it } from "vitest";
import {
  apiJson,
  apiError,
  apiOptions,
  apiRateLimited,
  API_SUCCESS_CACHE_CONTROL,
  USERNAME_LINK_NOTICE,
} from "@/lib/api/responses";

describe("apiJson", () => {
  it("returns 200 with CORS, cache headers, and the payload", async () => {
    const res = apiJson({ hello: "world" });
    expect(res.status).toBe(200);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(res.headers.get("Cache-Control")).toBe(API_SUCCESS_CACHE_CONTROL);
    expect(await res.json()).toEqual({ hello: "world" });
  });

  it("merges extra headers", () => {
    const res = apiJson({}, { "X-RateLimit-Remaining": "59" });
    expect(res.headers.get("X-RateLimit-Remaining")).toBe("59");
  });
});

describe("apiError", () => {
  it("returns the spec error envelope with no-store cache", async () => {
    const res = apiError(400, "invalid_username", "Bad username.");
    expect(res.status).toBe(400);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(await res.json()).toEqual({
      error: { code: "invalid_username", message: "Bad username." },
    });
  });
});

describe("apiOptions", () => {
  it("returns 204 with CORS method headers", () => {
    const res = apiOptions();
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Methods")).toContain("GET");
    expect(res.headers.get("Access-Control-Allow-Methods")).toContain("POST");
  });
});

describe("apiRateLimited", () => {
  it("returns 429 with rate_limited code and passes through headers", async () => {
    const res = apiRateLimited({ "Retry-After": "30" });
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("30");
    const body = await res.json();
    expect(body.error.code).toBe("rate_limited");
  });
});

describe("USERNAME_LINK_NOTICE", () => {
  it("is dated and points at llms.txt", () => {
    expect(USERNAME_LINK_NOTICE).toMatch(/\d{4}-\d{2}-\d{2}/);
    expect(USERNAME_LINK_NOTICE).toContain("llms.txt");
  });
});
