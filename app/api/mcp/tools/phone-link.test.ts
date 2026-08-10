import { describe, expect, it } from "vitest";
import { phoneLinkTool } from "./phone-link";

function text(result: ReturnType<typeof phoneLinkTool>) {
  return JSON.parse((result.content[0] as { text: string }).text);
}

describe("phoneLinkTool", () => {
  it("generates a link for a valid phone number", () => {
    const result = phoneLinkTool({ phone: "15550001234" });
    const body = text(result);
    expect(body.phone).toBe("15550001234");
    expect(body.link).toBe("https://wa.me/15550001234");
  });

  it("sanitizes symbols/spaces before generating the link", () => {
    const result = phoneLinkTool({ phone: "+1 (555) 000-1234" });
    expect(text(result).phone).toBe("15550001234");
  });

  it("errors with missing_phone when phone is empty", () => {
    const result = phoneLinkTool({ phone: "" });
    expect(result.isError).toBe(true);
    expect(text(result).code).toBe("missing_phone");
  });

  it("returns a mapped error code for an invalid phone number", () => {
    const result = phoneLinkTool({ phone: "123" });
    expect(result.isError).toBe(true);
    expect(text(result).code).toBe("phone_invalid_format");
  });
});
