import { describe, expect, it } from "vitest";
import { POST } from "./route";

function req(body: unknown): Request {
  return new Request("http://localhost/api/v1/business/username/validate", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/v1/business/username/validate", () => {
  it("returns valid=true with empty reasons for a good username", async () => {
    const res = await POST(req({ username: "joao.silva" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ valid: true, reasons: [] });
  });

  it("returns valid=false with reasons for a bad username", async () => {
    const res = await POST(req({ username: "abc.com" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ valid: false, reasons: ["reserved_domain_suffix"] });
  });

  it("400s when username field is missing", async () => {
    const res = await POST(req({}));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("missing_username");
  });

  it("400s with missing_username when the JSON body is null", async () => {
    const res = await POST(req(null));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("missing_username");
  });
});
