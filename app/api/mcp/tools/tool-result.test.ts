import { describe, expect, it } from "vitest";
import { errorResult, jsonResult, rateLimitedResult } from "./tool-result";

describe("jsonResult", () => {
  it("wraps data as a single text content block", () => {
    const result = jsonResult({ valid: true });
    expect(result.isError).toBeUndefined();
    expect(result.content).toEqual([{ type: "text", text: JSON.stringify({ valid: true }) }]);
  });
});

describe("errorResult", () => {
  it("marks isError and encodes code/message as JSON text", () => {
    const result = errorResult("missing_username", 'Param "username" is required.');
    expect(result.isError).toBe(true);
    expect(result.content).toEqual([
      {
        type: "text",
        text: JSON.stringify({ code: "missing_username", message: 'Param "username" is required.' }),
      },
    ]);
  });
});

describe("rateLimitedResult", () => {
  it("returns the rate_limited error shape", () => {
    const result = rateLimitedResult();
    expect(result.isError).toBe(true);
    const parsed = JSON.parse((result.content[0] as { text: string }).text);
    expect(parsed).toEqual({ code: "rate_limited", message: "Too many requests, slow down." });
  });
});
