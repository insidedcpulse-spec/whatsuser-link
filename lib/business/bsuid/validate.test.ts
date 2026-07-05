import { describe, expect, it } from "vitest";
import { validateBsuid } from "./validate";

describe("validateBsuid", () => {
  it("accepts a plain BSUID", () => {
    expect(validateBsuid("US.13491208655302741918")).toEqual({ valid: true, isParent: false });
  });

  it("accepts a parent BSUID", () => {
    expect(validateBsuid("US.ENT.11815799212886844830")).toEqual({ valid: true, isParent: true });
  });

  it("rejects a lowercase country code", () => {
    expect(validateBsuid("us.13491208655302741918")).toEqual({ valid: false, isParent: false });
  });

  it("rejects a missing dot", () => {
    expect(validateBsuid("US13491208655302741918")).toEqual({ valid: false, isParent: false });
  });

  it("rejects a non-alphanumeric character in the id part", () => {
    expect(validateBsuid("US.1349-1208655302741918")).toEqual({ valid: false, isParent: false });
  });

  it("rejects an id part longer than 128 characters", () => {
    expect(validateBsuid(`US.${"a".repeat(129)}`)).toEqual({ valid: false, isParent: false });
  });
});
