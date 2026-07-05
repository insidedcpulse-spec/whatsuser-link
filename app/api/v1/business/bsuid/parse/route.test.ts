import { describe, expect, it } from "vitest";
import { POST } from "./route";

function req(body: unknown): Request {
  return new Request("http://localhost/api/v1/business/bsuid/parse", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/v1/business/bsuid/parse", () => {
  it("parses a valid BSUID", async () => {
    const res = await POST(req({ bsuid: "US.ENT.11815799212886844830" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ countryCode: "US", id: "11815799212886844830", isParent: true });
  });

  it("400s with invalid_bsuid for a malformed BSUID", async () => {
    const res = await POST(req({ bsuid: "not-a-bsuid" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("invalid_bsuid");
  });

  it("400s when bsuid field is missing", async () => {
    const res = await POST(req({}));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("missing_bsuid");
  });

  it("400s with missing_bsuid when the JSON body is null", async () => {
    const res = await POST(req(null));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("missing_bsuid");
  });
});
