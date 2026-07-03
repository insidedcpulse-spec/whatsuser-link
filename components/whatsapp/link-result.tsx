"use client";

import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { QrCodeDisplay } from "@/components/whatsapp/qr-code-display";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import type { GeneratedLink } from "@/types/whatsapp";

interface LinkResultProps {
  link: GeneratedLink;
  onReset: () => void;
}

export function LinkResult({ link, onReset }: LinkResultProps) {
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
      <div className="flex w-full items-center justify-between gap-3 rounded-lg bg-muted px-4 py-3">
        <div className="flex flex-col gap-2 text-left">
          <div>
            <p className="text-xs text-muted-foreground">{t("usernameLabel")}</p>
            <p className="font-mono text-sm break-all">{link.username}</p>
          </div>
          {link.usernameKey && (
            <div>
              <p className="text-xs text-muted-foreground">{t("keyLabel")}</p>
              <p className="font-mono text-sm break-all">{link.usernameKey}</p>
            </div>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            handleCopy(
              link.usernameKey ? `${link.username}\n${link.usernameKey}` : link.username
            )
          }
        >
          {t("copyButton")}
        </Button>
      </div>

      <p className="max-w-md text-xs text-muted-foreground">{t("formatNote")}</p>

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
