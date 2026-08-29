import { describe, expect, it } from "vitest";
import { WEBMCP_TOOLS, getWebMcpManifest } from "./webmcp";

describe("WebMCP Standard Bridge", () => {
  it("provides valid manifest structure", () => {
    const manifest = getWebMcpManifest();
    expect(manifest.name).toBe("WhatsUsernames WebMCP");
    expect(manifest.tools.length).toBe(5);
    expect(manifest.tools.map((t) => t.name)).toContain("create_whatsapp_phone_link");
    expect(manifest.tools.map((t) => t.name)).toContain("create_whatsapp_username_link");
  });

  it("executes create_whatsapp_phone_link tool", () => {
    const tool = WEBMCP_TOOLS.find((t) => t.name === "create_whatsapp_phone_link");
    expect(tool).toBeDefined();

    const res = tool!.execute({ phone: "+351 912 345 678", message: "Olá teste" });
    expect(res).toEqual({
      success: true,
      phone: "351912345678",
      url: "https://wa.me/351912345678?text=Ol%C3%A1%20teste",
      message: "Olá teste",
      shortLink: expect.stringContaining("351912345678"),
    });
  });

  it("executes create_whatsapp_username_link tool", () => {
    const tool = WEBMCP_TOOLS.find((t) => t.name === "create_whatsapp_username_link");
    expect(tool).toBeDefined();

    const res = tool!.execute({ username: "@techcorp", key: "AB12" });
    expect(res).toEqual({
      success: true,
      username: "techcorp",
      url: "https://wa.me/techcorp",
      key: "AB12",
      shortLink: expect.stringContaining("techcorp"),
    });
  });

  it("validates username syntax correctly", () => {
    const tool = WEBMCP_TOOLS.find((t) => t.name === "validate_whatsapp_username");
    expect(tool).toBeDefined();

    const validRes = tool!.execute({ username: "loja_oficial" });
    expect(validRes).toEqual({
      valid: true,
      username: "loja_oficial",
      errors: [],
    });

    const invalidRes = tool!.execute({ username: "ab" });
    expect(invalidRes.valid).toBe(false);
  });
});
