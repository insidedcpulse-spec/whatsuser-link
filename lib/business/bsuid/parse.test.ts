import { describe, expect, it } from "vitest";
import { parseBsuid } from "./parse";

describe("parseBsuid", () => {
  it("parses a plain BSUID", () => {
    expect(parseBsuid("US.13491208655302741918")).toEqual({
      countryCode: "US",
      id: "13491208655302741918",
      isParent: false,
    });
  });

  it("parses a parent BSUID", () => {
    expect(parseBsuid("US.ENT.11815799212886844830")).toEqual({
      countryCode: "US",
      id: "11815799212886844830",
      isParent: true,
    });
  });

  it("returns null for an invalid BSUID", () => {
    expect(parseBsuid("not-a-bsuid")).toBeNull();
  });
});
