import { NextResponse } from "next/server";
import { routing } from "@/i18n/routing";
import { getStripe, CRM_PRICE_LOOKUP_KEY } from "@/lib/crm/stripe";
import { currencyForCountry } from "@/lib/crm/pricing";

export const runtime = "nodejs";

const STRIPE_LOCALES: Record<string, "en" | "pt" | "es"> = { en: "en", pt: "pt", es: "es" };

export async function POST(request: Request) {
  try {
    const stripe = getStripe();
    const body = (await request.json().catch(() => ({}))) as { locale?: string };
    const locale = routing.locales.includes(body.locale as never) ? (body.locale as string) : "en";
    const country = request.headers.get("x-vercel-ip-country") ?? "";
    const origin = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;
    const prefix = locale === routing.defaultLocale ? "" : `/${locale}`;

    const priceId =
      process.env.STRIPE_CRM_PRICE_ID ??
      (await stripe.prices.list({ lookup_keys: [CRM_PRICE_LOOKUP_KEY], active: true, limit: 1 }))
        .data[0]?.id;
    if (!priceId) {
      return NextResponse.json({ error: "Price not configured" }, { status: 500 });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      // Stripe converts to the buyer's local currency and shows it at checkout.
      adaptive_pricing: { enabled: true },
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      locale: STRIPE_LOCALES[locale] ?? "auto",
      metadata: { country, currency_hint: currencyForCountry(country), app: "whatsusernames-crm" },
      subscription_data: { metadata: { country, app: "whatsusernames-crm" } },
      success_url: `${origin}${prefix}/crm/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}${prefix}/crm`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("checkout error", error);
    return NextResponse.json({ error: "Unable to start checkout" }, { status: 500 });
  }
}
