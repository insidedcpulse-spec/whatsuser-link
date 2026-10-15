import Stripe from "stripe";

let client: Stripe | null = null;

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  client ??= new Stripe(key);
  return client;
}

export const BULK_PRICE_LOOKUP_KEY = "whatsusernames_bulk_pack";
export const BULK_APP_TAG = "whatsusernames-bulk";
