import { describe, expect, it } from "vitest";
import { POST } from "./route";

function req(body: unknown): Request {
  return new Request("http://localhost/api/v1/business/contact/resolve", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/v1/business/contact/resolve", () => {
  it("resolves a username identifier", async () => {
    const res = await POST(req({ username: "joao.silva" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      id: "joao.silva",
      type: "username",
      username: "joao.silva",
      phone: null,
      bsuid: null,
      displayName: null,
      phoneKnown: false,
      bsuidKnown: false,
    });
  });

  it("400s with missing_identifier when no field is given", async () => {
    const res = await POST(req({}));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("missing_identifier");
  });

  it("400s with missing_identifier when more than one field is given", async () => {
    const res = await POST(req({ phone: "16505551234", username: "joao.silva" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("missing_identifier");
  });

  it("400s with missing_identifier when the JSON body is null", async () => {
    const res = await POST(req(null));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("missing_identifier");
  });
});
