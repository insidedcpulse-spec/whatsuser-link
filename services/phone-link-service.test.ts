import { describe, expect, it } from "vitest";
import { createPhoneWhatsAppLink } from "@/services/phone-link-service";

describe("createPhoneWhatsAppLink", () => {
  it("returns a generated link for a valid phone number without a message", () => {
    const result = createPhoneWhatsAppLink("351912345678");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.link.url).toBe("https://wa.me/351912345678");
      expect(result.link.message).toBeUndefined();
    }
  });

  it("returns a generated link with an encoded message", () => {
    const result = createPhoneWhatsAppLink("351912345678", "Olá!");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.link.url).toBe("https://wa.me/351912345678?text=Ol%C3%A1!");
    }
  });

  it("returns validation errors for an invalid phone number", () => {
    const result = createPhoneWhatsAppLink("123");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors).toContain("phoneErrors.invalidFormat");
    }
  });
});
