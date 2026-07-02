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
    expect(validateUsername("ab").valid).toBe(false);
  });

  it("accepts a username with 3 characters", () => {
    expect(validateUsername("abc").valid).toBe(true);
  });

  it("accepts a username with 35 characters", () => {
    expect(validateUsername("a".repeat(35)).valid).toBe(true);
  });

  it("rejects a username with 36 characters", () => {
    expect(validateUsername("a".repeat(36)).valid).toBe(false);
  });

  it("rejects a username starting with www.", () => {
    expect(validateUsername("www.joao").valid).toBe(false);
  });

  it("rejects a username ending in a domain suffix", () => {
    expect(validateUsername("joaosilva.com").valid).toBe(false);
  });

  it("rejects a username with only digits", () => {
    expect(validateUsername("123456").valid).toBe(false);
  });

  it("rejects a username with only symbols", () => {
    expect(validateUsername("..___..").valid).toBe(false);
  });

  it("accepts a valid alphanumeric username with dot and underscore", () => {
    expect(validateUsername("joao.silva_99").valid).toBe(true);
  });
});
