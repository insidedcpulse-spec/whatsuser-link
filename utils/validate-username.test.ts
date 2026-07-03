import { describe, expect, it } from "vitest";
import { sanitizeUsernameInput, validateUsername } from "@/utils/validate-username";

describe("sanitizeUsernameInput", () => {
  it("removes leading @", () => {
    expect(sanitizeUsernameInput("@joao.silva")).toBe("joao.silva");
  });

  it("removes spaces", () => {
    expect(sanitizeUsernameInput("joao silva")).toBe("joaosilva");
  });

  it("lowercases input", () => {
    expect(sanitizeUsernameInput("JoaoSilva")).toBe("joaosilva");
  });

  it("strips invalid characters", () => {
    expect(sanitizeUsernameInput("joao!silva#123")).toBe("joaosilva123");
  });
});

describe("validateUsername", () => {
  it("rejects a username with 2 characters", () => {
    const result = validateUsername("ab");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("errors.length");
  });

  it("accepts a username with 3 characters", () => {
    expect(validateUsername("abc").valid).toBe(true);
  });

  it("accepts a username with 35 characters", () => {
    expect(validateUsername("a".repeat(35)).valid).toBe(true);
  });

  it("rejects a username with 36 characters", () => {
    const result = validateUsername("a".repeat(36));
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("errors.length");
  });

  it("rejects a username starting with www.", () => {
    const result = validateUsername("www.joao");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("errors.startsWithWww");
  });

  it("rejects a username ending in a domain suffix", () => {
    const result = validateUsername("joaosilva.com");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("errors.reservedDomain");
  });

  it("rejects a username ending in a static file extension", () => {
    const result = validateUsername("alguem.js");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("errors.reservedDomain");
  });

  it("rejects a username with only digits", () => {
    const result = validateUsername("123456");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("errors.noLetter");
  });

  it("rejects a username with only symbols", () => {
    const result = validateUsername("..___..");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("errors.noLetter");
  });

  it("accepts a valid alphanumeric username with dot and underscore", () => {
    expect(validateUsername("joao.silva_99").valid).toBe(true);
  });
});
