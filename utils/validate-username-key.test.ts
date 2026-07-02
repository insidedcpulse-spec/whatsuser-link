import { describe, expect, it } from "vitest";
import { validateUsernameKey } from "@/utils/validate-username-key";

describe("validateUsernameKey", () => {
  it("accepts a 4-character alphanumeric key", () => {
    expect(validateUsernameKey("4821").valid).toBe(true);
  });

  it("accepts an 8-character alphanumeric key", () => {
    expect(validateUsernameKey("ab12cd34").valid).toBe(true);
  });

  it("rejects a 3-character key", () => {
    const result = validateUsernameKey("482");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("keyErrors.invalidFormat");
  });

  it("rejects a 9-character key", () => {
    const result = validateUsernameKey("123456789");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("keyErrors.invalidFormat");
  });

  it("rejects a key with symbols", () => {
    const result = validateUsernameKey("12-34");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("keyErrors.invalidFormat");
  });
});
