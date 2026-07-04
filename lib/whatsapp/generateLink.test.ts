import { describe, expect, it } from "vitest";
import { generateWhatsAppLink } from "@/lib/whatsapp/generateLink";

describe("generateWhatsAppLink", () => {
  it("builds a link without a message", () => {
    expect(generateWhatsAppLink("joao.silva")).toBe("https://wa.me/joao.silva");
  });

  it("builds a link with an encoded message", () => {
    const result = generateWhatsAppLink("joao.silva", "Olá! Gostava de falar contigo.");
    expect(result).toBe(
      "https://wa.me/joao.silva?text=Ol%C3%A1!%20Gostava%20de%20falar%20contigo."
    );
  });

  it("ignores an empty message", () => {
    expect(generateWhatsAppLink("joao.silva", "")).toBe("https://wa.me/joao.silva");
  });

  it("ignores a whitespace-only message", () => {
    expect(generateWhatsAppLink("joao.silva", "   ")).toBe("https://wa.me/joao.silva");
  });
});
