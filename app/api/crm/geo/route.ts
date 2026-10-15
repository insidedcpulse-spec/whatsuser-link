import { NextResponse } from "next/server";
import { currencyForCountry, formatCrmPrice } from "@/lib/crm/pricing";

export const runtime = "edge";

/** Reads Vercel's geo header and returns the visitor's currency + display price. */
export async function GET(request: Request) {
  const country = request.headers.get("x-vercel-ip-country");
  const currency = currencyForCountry(country);
  return NextResponse.json(
    { country, currency, price: formatCrmPrice(currency) },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
