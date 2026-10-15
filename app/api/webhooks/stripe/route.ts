import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/crm/stripe";
import { getSupabaseAdmin } from "@/lib/crm/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Patch = {
  stripe_subscription_id: string;
  status: string;
  email?: string | null;
  stripe_customer_id?: string | null;
  currency?: string | null;
  country?: string | null;
};

async function upsert(patch: Patch) {
  const clean = Object.fromEntries(Object.entries(patch).filter(([, v]) => v != null));
  const { error } = await getSupabaseAdmin()
    .from("crm_subscriptions")
    .upsert({ ...clean, updated_at: new Date().toISOString() }, { onConflict: "stripe_subscription_id" });
  if (error) throw new Error(`supabase upsert failed: ${error.message}`);
}

function idOf(ref: string | { id: string } | null | undefined): string | null {
  return typeof ref === "string" ? ref : (ref?.id ?? null);
}

function invoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  // New API versions nest it under parent; older ones expose invoice.subscription.
  const legacy = (invoice as unknown as { subscription?: string | { id: string } | null }).subscription;
  return idOf(invoice.parent?.subscription_details?.subscription ?? legacy);
}

async function handle(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const subscriptionId = idOf(session.subscription);
      if (session.mode !== "subscription" || !subscriptionId) return;
      await upsert({
        stripe_subscription_id: subscriptionId,
        stripe_customer_id: idOf(session.customer),
        email: session.customer_details?.email ?? session.customer_email,
        currency: session.currency,
        country: session.customer_details?.address?.country ?? session.metadata?.country ?? null,
        status: session.payment_status === "paid" ? "active" : "incomplete",
      });
      return;
    }
    case "invoice.paid":
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = invoiceSubscriptionId(invoice);
      if (!subscriptionId) return;
      await upsert({
        stripe_subscription_id: subscriptionId,
        stripe_customer_id: idOf(invoice.customer),
        email: invoice.customer_email,
        currency: invoice.currency,
        status: event.type === "invoice.paid" ? "active" : "past_due",
      });
      return;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await upsert({
        stripe_subscription_id: sub.id,
        stripe_customer_id: idOf(sub.customer),
        status: "canceled",
      });
      return;
    }
  }
}

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!secret || !signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  // Raw body is required for signature verification.
  const raw = await request.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(raw, signature, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    await handle(event);
  } catch (error) {
    console.error("stripe webhook handler failed", event.type, error);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 }); // Stripe retries
  }
  return NextResponse.json({ received: true });
}
