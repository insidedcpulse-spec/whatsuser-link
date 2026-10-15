import { describe, expect, it } from "vitest";
import { generateWhatsAppLink } from "@/lib/whatsapp/generateLink";

describe("generateWhatsAppLink", () => {
  it("builds a link without a message", () => {
    expect(generateWhatsAppLink("john.smith")).toBe("https://wa.me/john.smith");
  });

  it("builds a link with an encoded message", () => {
    const result = generateWhatsAppLink("john.smith", "Olá! Gostava de falar contigo.");
    expect(result).toBe(
      "https://wa.me/john.smith?text=Ol%C3%A1!%20Gostava%20de%20falar%20contigo."
    );
  });

  it("ignores an empty message", () => {
    expect(generateWhatsAppLink("john.smith", "")).toBe("https://wa.me/john.smith");
  });

  it("ignores a whitespace-only message", () => {
    expect(generateWhatsAppLink("john.smith", "   ")).toBe("https://wa.me/john.smith");
  });
});
