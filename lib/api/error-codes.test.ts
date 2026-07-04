import { describe, expect, it } from "vitest";
import { mapValidationError, ALL_MAPPED_I18N_KEYS } from "@/lib/api/error-codes";

describe("mapValidationError", () => {
  it("maps every known validator i18n key to a stable code + message", () => {
    const expectedKeys = [
      "errors.length",
      "errors.invalidChars",
      "errors.noLetter",
      "errors.startsWithWww",
      "errors.reservedDomain",
      "keyErrors.invalidFormat",
      "phoneErrors.invalidFormat",
    ];
    expect(ALL_MAPPED_I18N_KEYS.sort()).toEqual(expectedKeys.sort());

    for (const key of expectedKeys) {
      const detail = mapValidationError(key);
      expect(detail.code).toMatch(/^[a-z_]+$/);
      expect(detail.message.length).toBeGreaterThan(10);
    }
  });

  it("maps specific keys to specific codes", () => {
    expect(mapValidationError("errors.length").code).toBe("username_length");
    expect(mapValidationError("keyErrors.invalidFormat").code).toBe("key_invalid_format");
    expect(mapValidationError("phoneErrors.invalidFormat").code).toBe("phone_invalid_format");
  });

  it("falls back to invalid_input for unknown keys", () => {
    expect(mapValidationError("errors.somethingNew")).toEqual({
      code: "invalid_input",
      message: "Invalid input.",
    });
  });
});
