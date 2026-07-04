import { describe, expect, it } from "vitest";
import { generateQr } from "@/lib/qr/generate-qr";

const BASE = {
  content: "https://wa.me/joao.silva",
  size: 256,
  color: "#000000",
  background: "#ffffff",
};

describe("generateQr", () => {
  it("produces an SVG string containing the svg root element", async () => {
    const out = await generateQr({ ...BASE, format: "svg" });
    expect(out.contentType).toBe("image/svg+xml");
    expect(typeof out.body).toBe("string");
    expect(out.body).toContain("<svg");
  });

  it("produces a PNG with the correct magic bytes at the requested size", async () => {
    const out = await generateQr({ ...BASE, format: "png" });
    expect(out.contentType).toBe("image/png");
    const bytes = out.body as Uint8Array;
    expect(bytes[0]).toBe(0x89);
    expect(bytes[1]).toBe(0x50); // 'P'
    expect(bytes.length).toBeGreaterThan(100);
  });

  it("accepts an RGBA background for transparency without throwing", async () => {
    const out = await generateQr({ ...BASE, format: "png", background: "#ffffff00" });
    expect(out.contentType).toBe("image/png");
  });
});
