/**
 * Display pricing for the CRM plan. The base price is $5.99 USD/month and is the
 * only amount Stripe actually bills; local figures are indicative conversions
 * for display. Stripe Adaptive Pricing presents the exact local amount at
 * checkout.
 */
export const BASE_PRICE_USD = 5.99;

export type CrmCurrency = "USD" | "EUR" | "GBP" | "BRL" | "CAD" | "AUD" | "MXN";

/** Indicative USD -> currency rates, used for display only. */
const DISPLAY_RATES: Record<CrmCurrency, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  BRL: 5.2,
  CAD: 1.37,
  AUD: 1.52,
  MXN: 18.2,
};

const EURO_ZONE = [
  "AT", "BE", "CY", "DE", "EE", "ES", "FI", "FR", "GR", "HR", "IE", "IT",
  "LT", "LU", "LV", "MT", "NL", "PT", "SI", "SK",
];

const COUNTRY_CURRENCY: Record<string, CrmCurrency> = {
  BR: "BRL",
  GB: "GBP",
  CA: "CAD",
  AU: "AUD",
  MX: "MXN",
  ...Object.fromEntries(EURO_ZONE.map((c) => [c, "EUR" as const])),
};

const CURRENCY_LOCALE: Record<CrmCurrency, string> = {
  USD: "en-US",
  EUR: "de-DE",
  GBP: "en-GB",
  BRL: "pt-BR",
  CAD: "en-CA",
  AUD: "en-AU",
  MXN: "es-MX",
};

/** Timezone fallback for local dev, where x-vercel-ip-country is absent. */
const TIMEZONE_COUNTRY: Record<string, string> = {
  "Europe/Berlin": "DE",
  "Europe/Paris": "FR",
  "Europe/Madrid": "ES",
  "Europe/Lisbon": "PT",
  "Europe/Rome": "IT",
  "Europe/Amsterdam": "NL",
  "Europe/London": "GB",
  "America/Sao_Paulo": "BR",
  "America/Toronto": "CA",
  "America/Vancouver": "CA",
  "Australia/Sydney": "AU",
  "Australia/Melbourne": "AU",
  "America/Mexico_City": "MX",
};

export function currencyForCountry(country?: string | null): CrmCurrency {
  if (!country) return "USD";
  return COUNTRY_CURRENCY[country.toUpperCase()] ?? "USD";
}

export function countryFromTimezone(timeZone?: string | null): string | null {
  return (timeZone && TIMEZONE_COUNTRY[timeZone]) || null;
}

export function formatCrmPrice(currency: CrmCurrency): string {
  const amount = BASE_PRICE_USD * DISPLAY_RATES[currency];
  const rounded =
    currency === "BRL" || currency === "MXN"
      ? Math.round(amount * 10) / 10
      : Math.round(amount * 100) / 100;
  return new Intl.NumberFormat(CURRENCY_LOCALE[currency], {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rounded);
}
