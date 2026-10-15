import { describe, expect, it } from "vitest";
import { unzipSync, strFromU8 } from "fflate";
import { parseBulkCsv } from "./parse-csv";
import { buildBulkZip } from "./build-zip";

describe("buildBulkZip", () => {
  it("packs a PNG per valid row plus links.csv", async () => {
    const rows = parseBulkCsv("351912345678\njoao.silva\n!!");
    const files = unzipSync(await buildBulkZip(rows));
    expect(Object.keys(files).sort()).toEqual(["links.csv", "qr/0001.png", "qr/0002.png"]);
    expect(files["qr/0001.png"][0]).toBe(0x89);
    const csv = strFromU8(files["links.csv"]);
    expect(csv).toContain("https://wa.me/351912345678");
    expect(csv).toContain("invalid");
  });
});
