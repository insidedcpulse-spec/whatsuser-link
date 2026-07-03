"use client";

import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { QrCodeDisplay } from "@/components/whatsapp/qr-code-display";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import type { GeneratedPhoneLink } from "@/types/whatsapp";

interface PhoneLinkResultProps {
  link: GeneratedPhoneLink;
  onReset: () => void;
}

export function PhoneLinkResult({ link, onReset }: PhoneLinkResultProps) {
  const t = useTranslations("result");
  const { copy } = useCopyToClipboard();

  async function handleCopy(text: string) {
    const success = await copy(text);
    if (success) {
      toast.success(t("copySuccess"));
    } else {
      toast.error(t("copyError"));
    }
  }

  return (
    <div className="flex flex-col items-center gap-6 rounded-2xl border border-border bg-card p-8 text-center">
      <p className="break-all rounded-lg bg-muted px-4 py-3 font-mono text-sm">{link.url}</p>

      <div className="flex flex-wrap justify-center gap-3">
        <Button onClick={() => handleCopy(link.url)}>{t("copyButton")}</Button>
        <Button
          variant="outline"
          render={
            <a href={link.url} target="_blank" rel="noopener noreferrer">
              {t("openButton")}
            </a>
          }
        />
      </div>

      <QrCodeDisplay value={link.url} downloadLabel={t("downloadQr")} />

      <Button variant="ghost" onClick={onReset}>
        {t("resetButton")}
      </Button>
    </div>
  );
}
