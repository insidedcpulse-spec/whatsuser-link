import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

/** Subtle upsell shown under a generated single link/QR code. */
export function BulkUpsell() {
  const t = useTranslations("bulk");
  return (
    <p className="w-full border-t pt-4 text-sm text-muted-foreground">
      📦 {t("resultUpsell")}{" "}
      <Link href="/bulk" className="font-medium text-emerald-700 underline underline-offset-2 dark:text-emerald-400">
        {t("resultUpsellCta")}
      </Link>
    </p>
  );
}
