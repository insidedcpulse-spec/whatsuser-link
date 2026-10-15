"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { MAX_ROWS, parseBulkCsv } from "@/lib/bulk/parse-csv";

const STORAGE_KEY = "bulk-csv";

export function BulkTool({ sessionId }: { sessionId?: string }) {
  const t = useTranslations("bulk");
  const locale = useLocale();
  const [csv, setCsv] = useState("");
  const [busy, setBusy] = useState(false);
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setCsv(saved);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, csv);
    } catch {}
  }, [csv]);

  const rows = useMemo(() => parseBulkCsv(csv), [csv]);
  const valid = rows.filter((r) => r.ok);

  async function buy() {
    setBusy(true);
    try {
      const res = await fetch("/api/bulk/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale, consent: agreed }),
      });
      const { url } = (await res.json()) as { url?: string };
      if (!res.ok || !url) throw new Error();
      window.location.assign(url);
    } catch {
      toast.error(t("checkoutError"));
      setBusy(false);
    }
  }

  async function download() {
    setBusy(true);
    try {
      const res = await fetch("/api/bulk/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv, sessionId }),
      });
      if (!res.ok) throw new Error();
      const url = URL.createObjectURL(await res.blob());
      const a = Object.assign(document.createElement("a"), { href: url, download: "whatsapp-links-qr.zip" });
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(t("downloadError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <label className="text-sm font-medium" htmlFor="bulk-csv">
        {t("inputLabel", { max: MAX_ROWS })}
      </label>
      <textarea
        id="bulk-csv"
        value={csv}
        onChange={(e) => setCsv(e.target.value)}
        placeholder={t("placeholder")}
        rows={8}
        className="w-full rounded-lg border bg-background p-3 font-mono text-sm"
      />
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <button
          type="button"
          onClick={() => setCsv(t("exampleCsv"))}
          className="underline underline-offset-2"
        >
          {t("exampleLink")}
        </button>
        <a href="/whatsapp-links-example.csv" download className="underline underline-offset-2">
          {t("exampleDownload")}
        </a>
      </div>
      <input
        type="file"
        accept=".csv,text/csv,text/plain"
        aria-label={t("upload")}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file) setCsv(await file.text());
        }}
        className="text-sm"
      />

      {rows.length > 0 && (
        <div className="rounded-lg border bg-muted/40 p-3 text-sm">
          <p className="font-medium">
            {t("summary", { valid: valid.length, invalid: rows.length - valid.length })}
          </p>
          <ul className="mt-2 space-y-1 font-mono text-xs text-muted-foreground">
            {valid.slice(0, 3).map((r) => (
              <li key={r.index} className="truncate">{r.url}</li>
            ))}
          </ul>
        </div>
      )}

      {sessionId ? (
        <Button size="lg" onClick={download} disabled={busy || valid.length === 0}>
          {busy ? t("generating") : t("download")}
        </Button>
      ) : (
        <>
          <label className="flex items-start gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              {t("consent")}{" "}
              <Link href="/terms-of-service" className="underline underline-offset-2">
                →
              </Link>
            </span>
          </label>
          <Button size="lg" onClick={buy} disabled={busy || valid.length === 0 || !agreed}>
            {busy ? t("redirecting") : t("buy")}
          </Button>
        </>
      )}
    </div>
  );
}
