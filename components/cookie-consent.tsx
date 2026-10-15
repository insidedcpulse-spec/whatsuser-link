"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { OPEN_SETTINGS_EVENT, readConsent, saveConsent } from "@/lib/consent";

const ADSENSE_SRC =
  "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5219655673819952";

function loadAdSense() {
  if (document.querySelector("script[data-adsense]")) return;
  const script = document.createElement("script");
  script.async = true;
  script.src = ADSENSE_SRC;
  script.crossOrigin = "anonymous";
  script.dataset.adsense = "1";
  document.head.appendChild(script);
}

/** Consent banner. AdSense is only loaded after the visitor accepts advertising. */
export function CookieConsent() {
  const t = useTranslations("cookies");
  const [open, setOpen] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [ads, setAds] = useState(false);

  useEffect(() => {
    const saved = readConsent();
    if (saved?.ads) loadAdSense();
    if (!saved) setOpen(true);

    const reopen = () => {
      setAds(readConsent()?.ads ?? false);
      setCustomizing(true);
      setOpen(true);
    };
    window.addEventListener(OPEN_SETTINGS_EVENT, reopen);
    return () => window.removeEventListener(OPEN_SETTINGS_EVENT, reopen);
  }, []);

  function choose(value: boolean) {
    const hadAds = readConsent()?.ads ?? false;
    saveConsent(value);
    setOpen(false);
    setCustomizing(false);
    if (value) loadAdSense();
    // Already-loaded ad scripts can't be unloaded: reload to drop them.
    else if (hadAds) window.location.reload();
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label={t("title")}
      className="fixed inset-x-0 bottom-0 z-50 border-t bg-background p-4 shadow-lg sm:inset-x-auto sm:bottom-4 sm:left-4 sm:max-w-md sm:rounded-xl sm:border"
    >
      <p className="font-semibold">{t("title")}</p>
      <p className="mt-1 text-sm text-muted-foreground">
        {t("text")}{" "}
        <Link href="/privacy-policy" className="underline underline-offset-2">
          {t("policyLink")}
        </Link>
      </p>

      {customizing && (
        <div className="mt-3 flex flex-col gap-2 text-sm">
          <label className="flex items-start gap-2 opacity-70">
            <input type="checkbox" checked disabled className="mt-0.5" />
            <span>
              <strong>{t("necessaryTitle")}</strong> — {t("necessaryDesc")}
            </span>
          </label>
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={ads}
              onChange={(e) => setAds(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              <strong>{t("adsTitle")}</strong> — {t("adsDesc")}
            </span>
          </label>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <Button onClick={() => choose(false)} variant="outline">
          {t("reject")}
        </Button>
        {customizing ? (
          <Button onClick={() => choose(ads)} variant="outline">
            {t("save")}
          </Button>
        ) : (
          <Button onClick={() => setCustomizing(true)} variant="outline">
            {t("customize")}
          </Button>
        )}
        <Button onClick={() => choose(true)}>{t("accept")}</Button>
      </div>
    </div>
  );
}

export function CookieSettingsLink({ className }: { className?: string }) {
  const t = useTranslations("cookies");
  return (
    <button
      type="button"
      className={className}
      onClick={() => window.dispatchEvent(new Event(OPEN_SETTINGS_EVENT))}
    >
      {t("settingsLink")}
    </button>
  );
}
