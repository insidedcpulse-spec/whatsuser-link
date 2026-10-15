import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CheckoutButton } from "./checkout-button";
import { CrmPrice } from "./crm-price";

/** Promo block for the home page, rendered below the link generators. */
export function CrmBanner() {
  const t = useTranslations("crm");
  return (
    <section className="w-full max-w-4xl rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50 to-background dark:from-emerald-950/40 p-6 sm:p-8 flex flex-col items-center gap-4 text-center">
      <span className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white">
        {t("badge")}
      </span>
      <h2 className="max-w-2xl text-2xl sm:text-3xl font-bold tracking-tight">{t("bannerTitle")}</h2>
      <p className="max-w-2xl text-muted-foreground">{t("bannerSubtitle")}</p>
      <CrmPrice />
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/crm"
          className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium hover:bg-muted transition-colors"
        >
          {t("howItWorksBtn")}
        </Link>
        <CheckoutButton />
      </div>
    </section>
  );
}
