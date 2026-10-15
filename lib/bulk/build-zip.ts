import { zipSync } from "fflate";
import { generateQr } from "@/lib/qr/generate-qr";
import type { BulkRow } from "./parse-csv";

const csvCell = (v: string) => `"${v.replace(/"/g, '""')}"`;

/** ZIP with one PNG QR per valid row (qr/0001.png …) and a links.csv index. */
export async function buildBulkZip(rows: BulkRow[]): Promise<Uint8Array> {
  const files: Record<string, Uint8Array> = {};
  const lines = ["id,input,status,url,file"];

  for (const row of rows) {
    const id = String(row.index + 1).padStart(4, "0");
    if (!row.ok || !row.url) {
      lines.push([id, csvCell(row.input), "invalid", "", ""].join(","));
      continue;
    }
    const qr = await generateQr({ content: row.url, format: "png", size: 400, color: "#000000", background: "#ffffff" });
    files[`qr/${id}.png`] = qr.body as Uint8Array;
    lines.push([id, csvCell(row.input), "ok", csvCell(row.url), `qr/${id}.png`].join(","));
  }

  files["links.csv"] = new TextEncoder().encode(lines.join("\n") + "\n");
  return zipSync(files, { level: 0 });
}
