import { describe, expect, it } from "vitest";
import { countryFromTimezone, currencyForCountry, formatCrmPrice } from "./pricing";

describe("crm pricing", () => {
  it("maps countries to currencies", () => {
    expect(currencyForCountry("DE")).toBe("EUR");
    expect(currencyForCountry("br")).toBe("BRL");
    expect(currencyForCountry("GB")).toBe("GBP");
    expect(currencyForCountry("US")).toBe("USD");
    expect(currencyForCountry(null)).toBe("USD");
    expect(currencyForCountry("JP")).toBe("USD");
  });

  it("formats USD base price exactly", () => {
    expect(formatCrmPrice("USD")).toBe("$5.99");
  });

  it("formats local currencies with their symbol", () => {
    expect(formatCrmPrice("EUR")).toContain("€");
    expect(formatCrmPrice("GBP")).toContain("£");
    expect(formatCrmPrice("BRL")).toContain("R$");
  });

  it("falls back to timezone", () => {
    expect(countryFromTimezone("Europe/Berlin")).toBe("DE");
    expect(countryFromTimezone("Asia/Tokyo")).toBeNull();
  });
});
