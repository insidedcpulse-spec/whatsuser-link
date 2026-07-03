import { describe, expect, it } from "vitest";
import { sanitizePhoneInput, validatePhoneNumber } from "@/utils/validate-phone";

describe("sanitizePhoneInput", () => {
  it("removes spaces", () => {
    expect(sanitizePhoneInput("912 345 678")).toBe("912345678");
  });

  it("removes dashes and parentheses", () => {
    expect(sanitizePhoneInput("(912)-345-678")).toBe("912345678");
  });

  it("removes a leading plus sign", () => {
    expect(sanitizePhoneInput("+351912345678")).toBe("351912345678");
  });
});

describe("validatePhoneNumber", () => {
  it("rejects a number with 7 digits", () => {
    const result = validatePhoneNumber("1234567");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("phoneErrors.invalidFormat");
  });

  it("accepts a number with 8 digits", () => {
    expect(validatePhoneNumber("12345678").valid).toBe(true);
  });

  it("accepts a number with 15 digits", () => {
    expect(validatePhoneNumber("1".repeat(15)).valid).toBe(true);
  });

  it("rejects a number with 16 digits", () => {
    const result = validatePhoneNumber("1".repeat(16));
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("phoneErrors.invalidFormat");
  });
});
