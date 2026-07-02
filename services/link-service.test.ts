import { describe, expect, it } from "vitest";
import { createWhatsAppLink } from "@/services/link-service";

describe("createWhatsAppLink", () => {
  it("returns a generated link for a valid username", () => {
    const result = createWhatsAppLink("joao.silva", "Olá!");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.link.url).toBe("https://wa.me/u/joao.silva?text=Ol%C3%A1!");
    }
  });

  it("returns validation errors for an invalid username", () => {
    const result = createWhatsAppLink("ab");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.validation.errors.length).toBeGreaterThan(0);
    }
  });
});
