import { describe, expect, it } from "vitest";
import { validateBusinessUsername } from "./validate";

describe("validateBusinessUsername", () => {
  it("accepts a valid username regardless of case", () => {
    expect(validateBusinessUsername("myID")).toEqual({ valid: true, reasons: [] });
  });

  it("treats dot and underscore as distinct (not folded)", () => {
    expect(validateBusinessUsername("my.id")).toEqual({ valid: true, reasons: [] });
    expect(validateBusinessUsername("my_id")).toEqual({ valid: true, reasons: [] });
  });

  it("rejects consecutive dots", () => {
    expect(validateBusinessUsername("ab..cd")).toEqual({ valid: false, reasons: ["consecutive_dots"] });
  });

  it("rejects a leading dot", () => {
    expect(validateBusinessUsername(".abcd")).toEqual({ valid: false, reasons: ["leading_or_trailing_dot"] });
  });

  it("rejects a trailing dot", () => {
    expect(validateBusinessUsername("abcd.")).toEqual({ valid: false, reasons: ["leading_or_trailing_dot"] });
  });

  it("rejects a leading www", () => {
    expect(validateBusinessUsername("wwwabc")).toEqual({ valid: false, reasons: ["leading_www"] });
  });

  it("rejects a trailing reserved domain suffix", () => {
    expect(validateBusinessUsername("abc.com")).toEqual({ valid: false, reasons: ["reserved_domain_suffix"] });
  });

  it("rejects non-English characters", () => {
    expect(validateBusinessUsername("josé")).toEqual({ valid: false, reasons: ["invalid_character"] });
  });

  it("rejects fewer than 3 characters", () => {
    expect(validateBusinessUsername("ab")).toEqual({ valid: false, reasons: ["too_short"] });
  });

  it("rejects more than 35 characters", () => {
    expect(validateBusinessUsername("a".repeat(36))).toEqual({ valid: false, reasons: ["too_long"] });
  });

  it("rejects a username with no letter", () => {
    expect(validateBusinessUsername("12345")).toEqual({ valid: false, reasons: ["no_letter"] });
  });
});
