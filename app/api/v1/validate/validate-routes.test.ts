import { describe, expect, it } from "vitest";
import { GET as getUsername } from "./username/route";
import { GET as getKey } from "./key/route";
import { GET as getPhone } from "./phone/route";

function req(path: string, query: string): Request {
  return new Request(`http://localhost/api/v1/validate/${path}${query}`);
}

describe("GET /api/v1/validate/username", () => {
  it("returns valid=true for a good username", async () => {
    const res = await getUsername(req("username", "?username=joao.silva"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ valid: true, errors: [] });
  });

  it("returns 200 valid=false with mapped codes for a bad username", async () => {
    const res = await getUsername(req("username", "?username=ab"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.valid).toBe(false);
    expect(body.errors[0].code).toBe("username_length");
    expect(body.errors[0].message).toBeDefined();
  });

  it("sanitizes before validating (uppercase @handle passes)", async () => {
    const res = await getUsername(req("username", "?username=@Joao.Silva"));
    expect((await res.json()).valid).toBe(true);
  });

  it("400s when the param is missing", async () => {
    const res = await getUsername(req("username", ""));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("missing_username");
  });
});

describe("GET /api/v1/validate/key", () => {
  it("valid key → valid=true", async () => {
    const res = await getKey(req("key", "?key=AB12"));
    expect(await res.json()).toEqual({ valid: true, errors: [] });
  });

  it("invalid key → valid=false with key_invalid_format", async () => {
    const body = await (await getKey(req("key", "?key=x"))).json();
    expect(body.valid).toBe(false);
    expect(body.errors[0].code).toBe("key_invalid_format");
  });

  it("missing param → 400 missing_key", async () => {
    const res = await getKey(req("key", ""));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("missing_key");
  });
});

describe("GET /api/v1/validate/phone", () => {
  it("valid phone (with symbols, sanitized) → valid=true", async () => {
    const res = await getPhone(req("phone", `?phone=${encodeURIComponent("+351 912 345 678")}`));
    expect(await res.json()).toEqual({ valid: true, errors: [] });
  });

  it("invalid phone → valid=false with phone_invalid_format", async () => {
    const body = await (await getPhone(req("phone", "?phone=123"))).json();
    expect(body.valid).toBe(false);
    expect(body.errors[0].code).toBe("phone_invalid_format");
  });

  it("missing param → 400 missing_phone", async () => {
    const res = await getPhone(req("phone", ""));
    expect(res.status).toBe(400);
  });
});
