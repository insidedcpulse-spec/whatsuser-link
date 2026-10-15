import { describe, expect, it } from "vitest";
import { MAX_ROWS, parseBulkCsv } from "./parse-csv";

describe("parseBulkCsv", () => {
  it("detects phones and usernames and builds links", () => {
    const rows = parseBulkCsv("+351 912 345 678,Olá\njohn.smith");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ kind: "phone", ok: true });
    expect(rows[0].url).toBe("https://wa.me/351912345678?text=Ol%C3%A1");
    expect(rows[1]).toMatchObject({ kind: "username", ok: true, url: "https://wa.me/john.smith" });
  });

  it("skips a header row and blank lines", () => {
    const rows = parseBulkCsv("phone,message\n\n351912345678,hi\n");
    expect(rows).toHaveLength(1);
    expect(rows[0].ok).toBe(true);
  });

  it("supports quoted messages containing commas", () => {
    const rows = parseBulkCsv('351912345678,"Hi, there"');
    expect(rows[0].url).toBe("https://wa.me/351912345678?text=Hi%2C%20there");
  });

  it("flags invalid rows without throwing", () => {
    const rows = parseBulkCsv("123\n!!");
    expect(rows.every((r) => !r.ok)).toBe(true);
  });

  it("caps the number of rows", () => {
    const csv = Array.from({ length: MAX_ROWS + 10 }, (_, i) => `3519123${String(i).padStart(5, "0")}`).join("\n");
    expect(parseBulkCsv(csv)).toHaveLength(MAX_ROWS);
  });
});
