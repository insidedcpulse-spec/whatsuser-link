"use client";

import { useTranslations } from "next-intl";
import { useCrmPrice } from "./use-crm-price";

export function CrmPrice({ className = "" }: { className?: string }) {
  const t = useTranslations("crm");
  const price = useCrmPrice();
  return (
    <div className={className}>
      <span className="text-4xl font-bold tracking-tight">{price}</span>
      <span className="ml-1 text-muted-foreground">{t("perMonth")}</span>
      <p className="mt-1 text-xs text-muted-foreground">{t("priceNote")}</p>
    </div>
  );
}
