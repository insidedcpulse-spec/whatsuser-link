import { describe, expect, it } from "vitest";
import { qrCodeTool } from "./qr-code";

function errorBody(result: Awaited<ReturnType<typeof qrCodeTool>>) {
  return JSON.parse((result.content[0] as { text: string }).text);
}

describe("qrCodeTool", () => {
  it("returns a base64 PNG image block for a valid username", async () => {
    const result = await qrCodeTool({ username: "joao.silva" });
    expect(result.isError).toBeUndefined();
    const block = result.content[0] as { type: string; data: string; mimeType: string };
    expect(block.type).toBe("image");
    expect(block.mimeType).toBe("image/png");
    expect(block.data.length).toBeGreaterThan(0);
  });

  it("returns a base64 PNG image block for a valid phone number", async () => {
    const result = await qrCodeTool({ phone: "15550001234" });
    const block = result.content[0] as { type: string };
    expect(block.type).toBe("image");
  });

  it("returns SVG markup as text when format is svg", async () => {
    const result = await qrCodeTool({ username: "joao.silva", format: "svg" });
    const block = result.content[0] as { type: string; text: string };
    expect(block.type).toBe("text");
    expect(block.text).toContain("<svg");
  });

  it("errors when both username and phone are provided", async () => {
    const result = await qrCodeTool({ username: "joao.silva", phone: "15550001234" });
    expect(result.isError).toBe(true);
    expect(errorBody(result).code).toBe("missing_target");
  });

  it("errors when neither username nor phone is provided", async () => {
    const result = await qrCodeTool({});
    expect(result.isError).toBe(true);
    expect(errorBody(result).code).toBe("missing_target");
  });

  it("errors on an out-of-range size", async () => {
    const result = await qrCodeTool({ username: "joao.silva", size: 50 });
    expect(result.isError).toBe(true);
    expect(errorBody(result).code).toBe("invalid_size");
  });

  it("errors on an invalid color", async () => {
    const result = await qrCodeTool({ username: "joao.silva", color: "zzzzzz" });
    expect(result.isError).toBe(true);
    expect(errorBody(result).code).toBe("invalid_color");
  });

  it("errors on an invalid username before validating QR options", async () => {
    const result = await qrCodeTool({ username: "ab" });
    expect(result.isError).toBe(true);
    expect(errorBody(result).code).toBe("username_length");
  });
});
