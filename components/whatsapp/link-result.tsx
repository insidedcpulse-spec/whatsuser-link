"use client";

import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { QrCodeDisplay } from "@/components/whatsapp/qr-code-display";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { siteConfig } from "@/config/site";
import type { GeneratedLink } from "@/types/whatsapp";

interface LinkResultProps {
  link: GeneratedLink;
  onReset: () => void;
}

export function LinkResult({ link, onReset }: LinkResultProps) {
  const t = useTranslations("result");
  const { copy } = useCopyToClipboard();
  const shortUrl = `${siteConfig.url}/${link.username}`;

  async function handleCopy(text: string) {
    const success = await copy(text);
    if (success) {
      toast.success(t("copySuccess"));
    } else {
      toast.error(t("copyError"));
    }
  }

  function handleCopyAll() {
    const lines = [t("usernameLabel"), `@${link.username}`, ""];

    if (link.usernameKey) {
      lines.push(t("keyLabel"), link.usernameKey, "");
    }

    lines.push(t("shortLinkLabel"), shortUrl);

    handleCopy(lines.join("\n"));
  }

  return (
    <div className="flex flex-col items-center gap-6 rounded-2xl border border-border bg-card p-8 text-center">
      <div className="flex w-full items-center justify-between gap-3 rounded-lg bg-muted px-4 py-3">
        <div className="flex flex-col gap-1 text-left">
          <p className="text-lg font-bold break-all">@{link.username}</p>
          {link.usernameKey && (
            <p className="font-mono text-xs text-muted-foreground break-all">
              {t("keyLabel")}: {link.usernameKey}
            </p>
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

      <p className="break-all rounded-lg bg-muted px-4 py-3 font-mono text-sm">{shortUrl}</p>

      <div className="flex flex-wrap justify-center gap-3">
        <Button onClick={() => handleCopy(shortUrl)}>{t("copyButton")}</Button>
        <Button
          variant="outline"
          render={
            <a href={shortUrl} target="_blank" rel="noopener noreferrer">
              {t("openButton")}
            </a>
          }
        />
        <Button variant="outline" onClick={handleCopyAll}>
          {t("copyAllButton")}
        </Button>
      </div>

      <QrCodeDisplay value={link.url} downloadLabel={t("downloadQr")} />

      <Button variant="ghost" onClick={onReset}>
        {t("resetButton")}
      </Button>
    </div>
  );
}
