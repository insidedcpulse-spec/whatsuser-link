import { describe, expect, it } from "vitest";
import { CONSENT_MAX_AGE_MS, CONSENT_VERSION, parseConsent } from "./consent";

const NOW = 1_800_000_000_000;
const make = (over: object = {}) =>
  JSON.stringify({ version: CONSENT_VERSION, ads: true, timestamp: NOW - 1000, ...over });

describe("parseConsent", () => {
  it("returns null when nothing is stored or JSON is invalid", () => {
    expect(parseConsent(null, NOW)).toBeNull();
    expect(parseConsent("{nope", NOW)).toBeNull();
  });

  it("accepts a valid recent choice, both accept and reject", () => {
    expect(parseConsent(make(), NOW)?.ads).toBe(true);
    expect(parseConsent(make({ ads: false }), NOW)?.ads).toBe(false);
  });

  it("re-asks when the choice is expired or from another version", () => {
    expect(parseConsent(make({ timestamp: NOW - CONSENT_MAX_AGE_MS - 1 }), NOW)).toBeNull();
    expect(parseConsent(make({ version: 99 }), NOW)).toBeNull();
  });

  it("rejects malformed shapes", () => {
    expect(parseConsent(make({ ads: "yes" }), NOW)).toBeNull();
    expect(parseConsent(make({ timestamp: "now" }), NOW)).toBeNull();
  });
});
