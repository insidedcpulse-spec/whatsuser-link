"use client";

import { useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Button } from "@/components/ui/button";

interface QrCodeDisplayProps {
  value: string;
  downloadLabel: string;
}

export function QrCodeDisplay({ value, downloadLabel }: QrCodeDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  function handleDownload() {
    const canvas = containerRef.current?.querySelector("canvas");
    if (!canvas) return;

    const link = document.createElement("a");
    link.download = "whatsuser-link-qrcode.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div ref={containerRef} className="rounded-2xl border border-border bg-white p-4">
        <QRCodeCanvas value={value} size={200} />
      </div>
      <Button variant="outline" onClick={handleDownload}>
        {downloadLabel}
      </Button>
    </div>
  );
}
