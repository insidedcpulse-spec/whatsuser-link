import { describe, expect, it } from "vitest";
import { usernameLinkTool } from "./username-link";

function text(result: Awaited<ReturnType<typeof usernameLinkTool>>) {
  return JSON.parse((result.content[0] as { text: string }).text);
}

describe("usernameLinkTool", () => {
  it("generates link, shortLink, and notice for a valid username", () => {
    const result = usernameLinkTool({ username: "joao.silva" });
    const body = text(result);
    expect(body.username).toBe("joao.silva");
    expect(body.link).toBe("https://wa.me/joao.silva");
    expect(body.shortLink).toContain("/joao.silva");
    expect(body.notice).toContain("wa.me");
    expect(body.key).toBeUndefined();
  });

  it("echoes key and encodes text", () => {
    const result = usernameLinkTool({ username: "joao.silva", key: "AB12", text: "hello world" });
    const body = text(result);
    expect(body.key).toBe("AB12");
    expect(body.link).toBe("https://wa.me/joao.silva?text=hello%20world");
  });

  it("sanitizes input like the UI does (@ prefix, uppercase)", () => {
    const result = usernameLinkTool({ username: "@Joao.Silva" });
    expect(text(result).username).toBe("joao.silva");
  });

  it("errors with missing_username when username is empty", () => {
    const result = usernameLinkTool({ username: "" });
    expect(result.isError).toBe(true);
    expect(text(result).code).toBe("missing_username");
  });

  it("returns a mapped error code for an invalid username", () => {
    const result = usernameLinkTool({ username: "ab" });
    expect(result.isError).toBe(true);
    expect(text(result).code).toBe("username_length");
  });

  it("returns a mapped error code for an invalid key", () => {
    const result = usernameLinkTool({ username: "joao.silva", key: "x" });
    expect(result.isError).toBe(true);
    expect(text(result).code).toBe("key_invalid_format");
  });
});
