import { describe, expect, it } from "vitest";
import { createWhatsAppLink } from "@/services/link-service";

describe("createWhatsAppLink", () => {
  it("returns a generated link for a valid username without a key", () => {
    const result = createWhatsAppLink("joao.silva", undefined, "Olá!");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.link.url).toBe("https://wa.me/u/joao.silva?text=Ol%C3%A1!");
      expect(result.link.usernameKey).toBeUndefined();
    }
  });

  it("returns a generated link including the username key when valid", () => {
    const result = createWhatsAppLink("joao.silva", "4821");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.link.usernameKey).toBe("4821");
    }
  });

  it("returns validation errors for an invalid username", () => {
    const result = createWhatsAppLink("ab");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors).toContain("errors.length");
    }
  });

  it("returns validation errors for an invalid username key", () => {
    const result = createWhatsAppLink("joao.silva", "12");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors).toContain("keyErrors.invalidFormat");
    }
  });
});
