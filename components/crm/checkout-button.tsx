"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function CheckoutButton({ className }: { className?: string }) {
  const t = useTranslations("crm");
  const locale = useLocale();
  const [loading, setLoading] = useState(false);

  async function start() {
    setLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale }),
      });
      const { url } = (await res.json()) as { url?: string };
      if (!res.ok || !url) throw new Error("checkout failed");
      window.location.assign(url);
    } catch {
      toast.error(t("checkoutError"));
      setLoading(false);
    }
  }

  return (
    <Button size="lg" onClick={start} disabled={loading} className={className}>
      {loading ? t("redirecting") : t("startNow")}
    </Button>
  );
}
