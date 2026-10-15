import { NextResponse } from "next/server";
import { routing } from "@/i18n/routing";
import { BULK_APP_TAG, BULK_PRICE_LOOKUP_KEY, getStripe } from "@/lib/bulk/stripe";

export const runtime = "nodejs";

const CHECKOUT_NOTICE: Record<string, string> = {
  en: "Digital product delivered immediately. By paying you lose your 14-day withdrawal right once the download starts. No VAT charged.",
  pt: "Produto digital entregue de imediato. Ao pagar, perdes o direito de livre resolução de 14 dias quando o download começar. Sem IVA.",
  es: "Producto digital entregado de inmediato. Al pagar pierdes el derecho de desistimiento de 14 días cuando empiece la descarga. Sin IVA.",
};

export async function POST(request: Request) {
  try {
    const stripe = getStripe();
    const body = (await request.json().catch(() => ({}))) as { locale?: string; consent?: boolean };
    if (body.consent !== true) {
      return NextResponse.json({ error: "Consent required" }, { status: 400 });
    }
    const locale = routing.locales.includes(body.locale as never) ? (body.locale as string) : "en";
    const origin = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;
    const prefix = locale === routing.defaultLocale ? "" : `/${locale}`;

    const price = (await stripe.prices.list({ lookup_keys: [BULK_PRICE_LOOKUP_KEY], active: true, limit: 1 })).data[0];
    if (!price) return NextResponse.json({ error: "Price not configured" }, { status: 500 });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: price.id, quantity: 1 }],
      adaptive_pricing: { enabled: true },
      automatic_tax: { enabled: false }, // seller is VAT-exempt (below threshold): price is final
      custom_text: { submit: { message: CHECKOUT_NOTICE[locale] ?? CHECKOUT_NOTICE.en } },
      locale: locale as "en" | "pt" | "es",
      metadata: { app: BULK_APP_TAG, consent_immediate_delivery: new Date().toISOString() },
      success_url: `${origin}${prefix}/bulk?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}${prefix}/bulk`,
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("bulk checkout error", error);
    return NextResponse.json({ error: "Unable to start checkout" }, { status: 500 });
  }
}
