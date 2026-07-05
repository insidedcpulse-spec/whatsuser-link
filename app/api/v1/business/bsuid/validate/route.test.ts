import { describe, expect, it } from "vitest";
import { POST } from "./route";

function req(body: unknown): Request {
  return new Request("http://localhost/api/v1/business/bsuid/validate", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/v1/business/bsuid/validate", () => {
  it("returns valid=true for a good BSUID", async () => {
    const res = await POST(req({ bsuid: "US.13491208655302741918" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ valid: true, isParent: false });
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  it("returns valid=false for a malformed BSUID", async () => {
    const res = await POST(req({ bsuid: "not-a-bsuid" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ valid: false, isParent: false });
  });

  it("400s when bsuid field is missing", async () => {
    const res = await POST(req({}));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("missing_bsuid");
  });

  it("400s when the body is not valid JSON", async () => {
    const res = await POST(new Request("http://localhost/x", { method: "POST", body: "{not json" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("invalid_json");
  });

  it("400s with missing_bsuid when the JSON body is null", async () => {
    const res = await POST(req(null));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("missing_bsuid");
  });
});
