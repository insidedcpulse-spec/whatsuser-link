import { describe, expect, it } from "vitest";
import { GET, OPTIONS } from "./route";

function req(query: string): Request {
  return new Request(`http://localhost/api/v1/username-link${query}`);
}

describe("GET /api/v1/username-link", () => {
  it("generates link, shortLink, and notice for a valid username", async () => {
    const res = await GET(req("?username=joao.silva"));
    expect(res.status).toBe(200);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    const body = await res.json();
    expect(body.username).toBe("joao.silva");
    expect(body.link).toBe("https://wa.me/joao.silva");
    expect(body.shortLink).toContain("/joao.silva");
    expect(body.notice).toContain("wa.me");
    expect(body.key).toBeUndefined();
  });

  it("echoes key and encodes text", async () => {
    const res = await GET(req("?username=joao.silva&key=AB12&text=hello world"));
    const body = await res.json();
    expect(body.key).toBe("AB12");
    expect(body.link).toBe("https://wa.me/joao.silva?text=hello%20world");
  });

  it("sanitizes input like the UI does (@ prefix, uppercase)", async () => {
    const res = await GET(req("?username=@Joao.Silva"));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.username).toBe("joao.silva");
  });

  it("400s with missing_username when the param is absent", async () => {
    const res = await GET(req(""));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("missing_username");
  });

  it("400s with a mapped stable code for an invalid username", async () => {
    const res = await GET(req("?username=ab"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("username_length");
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("400s with key_invalid_format for a bad key", async () => {
    const res = await GET(req("?username=joao.silva&key=x"));
    const body = await res.json();
    expect(body.error.code).toBe("key_invalid_format");
  });
});

describe("OPTIONS", () => {
  it("returns 204 with CORS headers", () => {
    const res = OPTIONS();
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});
