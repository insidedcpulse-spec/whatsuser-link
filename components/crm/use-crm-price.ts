"use client";

import { useEffect, useState } from "react";
import { countryFromTimezone, currencyForCountry, formatCrmPrice } from "@/lib/crm/pricing";

/** Price in the visitor's currency, from Vercel's geo header (timezone fallback in dev). */
export function useCrmPrice(): string {
  const [price, setPrice] = useState(() => formatCrmPrice("USD"));

  useEffect(() => {
    let cancelled = false;
    fetch("/api/crm/geo")
      .then((r) => r.json() as Promise<{ country: string | null; price: string }>)
      .then((geo) => {
        if (cancelled) return;
        if (geo.country) {
          setPrice(geo.price);
          return;
        }
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        setPrice(formatCrmPrice(currencyForCountry(countryFromTimezone(tz))));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return price;
}
