import { describe, expect, it } from "vitest";
import { validatePhoneTool } from "./validate-phone";

function text(result: ReturnType<typeof validatePhoneTool>) {
  return JSON.parse((result.content[0] as { text: string }).text);
}

describe("validatePhoneTool", () => {
  it("returns valid:true for a valid phone number", () => {
    const result = validatePhoneTool({ phone: "15550001234" });
    expect(result.isError).toBeUndefined();
    expect(text(result)).toEqual({ valid: true, errors: [] });
  });

  it("sanitizes symbols/spaces and a leading 0 like the REST route", () => {
    const result = validatePhoneTool({ phone: "+1 (555) 000-1234" });
    expect(text(result).valid).toBe(true);
  });

  it("returns a mapped error code for an invalid phone number", () => {
    const result = validatePhoneTool({ phone: "123" });
    const body = text(result);
    expect(body.valid).toBe(false);
    expect(body.errors).toContainEqual({
      code: "phone_invalid_format",
      message: "Phone must be 8-15 digits including country code (digits only, no spaces or symbols).",
    });
  });

  it("errors with missing_phone when phone is empty", () => {
    const result = validatePhoneTool({ phone: "" });
    expect(result.isError).toBe(true);
    expect(text(result).code).toBe("missing_phone");
  });
});
