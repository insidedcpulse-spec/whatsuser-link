import { describe, expect, it } from "vitest";
import { validateUsernameTool } from "./validate-username";

function text(result: ReturnType<typeof validateUsernameTool>) {
  return JSON.parse((result.content[0] as { text: string }).text);
}

describe("validateUsernameTool", () => {
  it("returns valid:true for a valid username", () => {
    const result = validateUsernameTool({ username: "joao.silva" });
    expect(result.isError).toBeUndefined();
    expect(text(result)).toEqual({ valid: true, errors: [] });
  });

  it("sanitizes input like the REST route (@ prefix, uppercase)", () => {
    const result = validateUsernameTool({ username: "@Joao.Silva" });
    expect(text(result).valid).toBe(true);
  });

  it("returns mapped error codes for an invalid username", () => {
    const result = validateUsernameTool({ username: "ab" });
    const body = text(result);
    expect(body.valid).toBe(false);
    expect(body.errors).toContainEqual({
      code: "username_length",
      message: "Username must be 3-35 characters.",
    });
  });

  it("errors with missing_username when username is empty", () => {
    const result = validateUsernameTool({ username: "" });
    expect(result.isError).toBe(true);
    expect(text(result).code).toBe("missing_username");
  });
});
