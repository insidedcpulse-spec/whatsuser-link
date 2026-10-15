import { NextResponse } from "next/server";
import { consumeBulkAccess } from "@/lib/bulk/access";
import { buildBulkZip } from "@/lib/bulk/build-zip";
import { parseBulkCsv } from "@/lib/bulk/parse-csv";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_CSV_BYTES = 200_000;

export async function POST(request: Request) {
  const { csv, sessionId } = (await request.json().catch(() => ({}))) as {
    csv?: string;
    sessionId?: string;
  };
  if (typeof csv !== "string" || !csv.trim() || csv.length > MAX_CSV_BYTES || !sessionId) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const rows = parseBulkCsv(csv);
  if (!rows.some((r) => r.ok)) {
    return NextResponse.json({ error: "No valid rows" }, { status: 422 });
  }

  let allowed = false;
  try {
    allowed = await consumeBulkAccess(sessionId);
  } catch (error) {
    console.error("bulk access check failed", error);
    return NextResponse.json({ error: "Unable to verify payment" }, { status: 502 });
  }
  if (!allowed) return NextResponse.json({ error: "Payment required" }, { status: 402 });

  const zip = await buildBulkZip(rows);
  return new NextResponse(Buffer.from(zip), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": 'attachment; filename="whatsapp-links-qr.zip"',
      "Cache-Control": "no-store",
    },
  });
}
