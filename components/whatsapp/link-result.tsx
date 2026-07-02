"use client";

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
  const { copy } = useCopyToClipboard();

  async function handleCopy() {
    const success = await copy(link.url);
    if (success) {
      toast.success("Link copiado!");
    } else {
      toast.error("Não foi possível copiar. Copia manualmente.");
    }
  }

  return (
    <div className="flex flex-col items-center gap-6 rounded-2xl border border-border bg-card p-8 text-center">
      <p className="break-all rounded-lg bg-muted px-4 py-3 font-mono text-sm">{link.url}</p>

      <div className="flex flex-wrap justify-center gap-3">
        <Button onClick={handleCopy}>Copiar</Button>
        <Button
          variant="outline"
          render={
            <a href={link.url} target="_blank" rel="noopener noreferrer">
              Abrir
            </a>
          }
        />
      </div>

      <QrCodeDisplay value={link.url} />

      <p className="max-w-md text-xs text-muted-foreground">
        Este link segue o formato mais recente disponível publicamente. Se a WhatsApp ainda
        não suportar o teu dispositivo/versão, atualiza a app.
      </p>

      <Button variant="ghost" onClick={onReset}>
        Gerar novo link
      </Button>
    </div>
  );
}
