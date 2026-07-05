import { describe, expect, it } from "vitest";
import { GET, OPTIONS } from "./route";

function req(query: string): Request {
  return new Request(`http://localhost/api/v1/qr${query}`);
}

describe("GET /api/v1/qr", () => {
  it("returns a PNG for a valid username", async () => {
    const res = await GET(req("?username=joao.silva"));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    const bytes = new Uint8Array(await res.arrayBuffer());
    expect(bytes[0]).toBe(0x89);
  });

  it("returns an SVG when format=svg", async () => {
    const res = await GET(req("?phone=351912345678&format=svg"));
    expect(res.headers.get("Content-Type")).toBe("image/svg+xml");
    expect(await res.text()).toContain("<svg");
  });

  it("400s when both username and phone are given", async () => {
    const res = await GET(req("?username=joao&phone=351912345678"));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("missing_target");
  });

  it("400s when neither is given", async () => {
    const res = await GET(req(""));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("missing_target");
  });

  it("400s on invalid username with the mapped code", async () => {
    const res = await GET(req("?username=ab"));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("username_length");
  });

  it("400s on bad format", async () => {
    const res = await GET(req("?username=joao.silva&format=gif"));
    expect((await res.json()).error.code).toBe("invalid_format");
  });

  it("400s on out-of-range size", async () => {
    const res = await GET(req("?username=joao.silva&size=4096"));
    expect((await res.json()).error.code).toBe("invalid_size");
  });

  it("400s on malformed color", async () => {
    const res = await GET(req("?username=joao.silva&color=red"));
    expect((await res.json()).error.code).toBe("invalid_color");
  });

  it("accepts bg=transparent", async () => {
    const res = await GET(req("?username=joao.silva&bg=transparent"));
    expect(res.status).toBe(200);
  });
});

describe("OPTIONS", () => {
  it("returns 204", () => {
    expect(OPTIONS().status).toBe(204);
  });
});
