import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getStripe } from "@/lib/crm/stripe";

export const metadata: Metadata = { robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const APP_URL = process.env.NEXT_PUBLIC_CRM_APP_URL ?? "https://app.whatsusernames.link";

async function isPaid(sessionId?: string): Promise<boolean> {
  if (!sessionId || !/^cs_(live|test)_[A-Za-z0-9]+$/.test(sessionId)) return false;
  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    return session.status === "complete" && session.payment_status !== "unpaid";
  } catch {
    return false;
  }
}

export default async function CrmSuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { locale } = await params;
  const { session_id } = await searchParams;
  const t = await getTranslations({ locale, namespace: "crm" });
  const paid = await isPaid(session_id);

  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-lg flex-col items-center justify-center gap-5 px-4 text-center">
      {paid ? (
        <>
          <h1 className="text-3xl font-bold tracking-tight">{t("successTitle")}</h1>
          <p className="text-muted-foreground">{t("successText")}</p>
          <a
            href={APP_URL}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-emerald-600 px-6 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
          >
            {t("successCta")} →
          </a>
        </>
      ) : (
        <>
          <p className="text-muted-foreground">{t("successPending")}</p>
          <Link href="/" className="text-sm font-medium underline underline-offset-4">
            {t("successHome")}
          </Link>
        </>
      )}
    </main>
  );
}
