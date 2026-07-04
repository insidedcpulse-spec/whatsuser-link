import { describe, expect, it } from "vitest";
import { GET, OPTIONS } from "./route";

function req(query: string): Request {
  return new Request(`http://localhost/api/v1/phone-link${query}`);
}

describe("GET /api/v1/phone-link", () => {
  it("generates a wa.me link for a valid international number", async () => {
    const res = await GET(req("?phone=351912345678"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.phone).toBe("351912345678");
    expect(body.link).toBe("https://wa.me/351912345678");
  });

  it("sanitizes + prefix, spaces, and other symbols", async () => {
    const res = await GET(req(`?phone=${encodeURIComponent("+351 912-345-678")}`));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.phone).toBe("351912345678");
  });

  it("appends the encoded text param", async () => {
    const res = await GET(req("?phone=351912345678&text=ola mundo"));
    const body = await res.json();
    expect(body.link).toBe("https://wa.me/351912345678?text=ola%20mundo");
  });

  it("400s with missing_phone when absent", async () => {
    const res = await GET(req(""));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("missing_phone");
  });

  it("400s with phone_invalid_format for a too-short number", async () => {
    const res = await GET(req("?phone=12345"));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("phone_invalid_format");
  });
});

describe("OPTIONS", () => {
  it("returns 204", () => {
    expect(OPTIONS().status).toBe(204);
  });
});
