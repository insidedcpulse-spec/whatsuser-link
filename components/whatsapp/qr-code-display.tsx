"use client";

import { useRef, useState } from "react";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";
import { jsPDF } from "jspdf";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type QrFormat = "png" | "jpeg" | "svg" | "pdf";

interface QrCodeDisplayProps {
  value: string;
  downloadLabel: string;
}

const QR_SIZE = 200;
const FORMATS: QrFormat[] = ["png", "jpeg", "svg", "pdf"];

export function QrCodeDisplay({ value, downloadLabel }: QrCodeDisplayProps) {
  const t = useTranslations("qr");
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const [color, setColor] = useState("#25D366");
  const [includeLogo, setIncludeLogo] = useState(false);
  const [transparent, setTransparent] = useState(false);
  const [format, setFormat] = useState<QrFormat>("png");

  const bgColor = transparent ? "transparent" : "#ffffff";
  const level = includeLogo ? "H" : "M";
  const imageSettings = includeLogo
    ? { src: "/chat-icon.svg", height: 40, width: 40, excavate: true }
    : undefined;

  function selectFormat(next: QrFormat) {
    setFormat(next);
    if (next === "jpeg") {
      setTransparent(false);
    }
  }

  function triggerDownload(href: string, filename: string) {
    const link = document.createElement("a");
    link.download = filename;
    link.href = href;
    link.click();
  }

  function handleDownload() {
    const canvas = canvasContainerRef.current?.querySelector("canvas");
    if (!canvas) return;

    if (format === "png") {
      triggerDownload(canvas.toDataURL("image/png"), "whatsuser-link-qrcode.png");
      return;
    }

    if (format === "jpeg") {
      triggerDownload(canvas.toDataURL("image/jpeg"), "whatsuser-link-qrcode.jpg");
      return;
    }

    if (format === "svg") {
      const svg = svgRef.current;
      if (!svg) return;
      svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      const blob = new Blob([svg.outerHTML], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      triggerDownload(url, "whatsuser-link-qrcode.svg");
      URL.revokeObjectURL(url);
      return;
    }

    const doc = new jsPDF({ unit: "px", hotfixes: ["px_scaling"], format: [QR_SIZE + 20, QR_SIZE + 20] });
    doc.addImage(canvas.toDataURL("image/png"), "PNG", 10, 10, QR_SIZE, QR_SIZE);
    doc.save("whatsuser-link-qrcode.pdf");
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        ref={canvasContainerRef}
        className="rounded-2xl border border-border p-4"
        style={{ backgroundColor: transparent ? "transparent" : "#ffffff" }}
      >
        <QRCodeCanvas
          value={value}
          size={QR_SIZE}
          fgColor={color}
          bgColor={bgColor}
          level={level}
          imageSettings={imageSettings}
        />
      </div>

      <QRCodeSVG
        ref={svgRef}
        value={value}
        size={QR_SIZE}
        fgColor={color}
        bgColor={bgColor}
        level={level}
        imageSettings={imageSettings}
        className="hidden"
      />

      <div className="flex w-full max-w-xs flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="qr-color">{t("colorLabel")}</Label>
          <input
            id="qr-color"
            type="color"
            value={color}
            onChange={(event) => setColor(event.target.value)}
            className="h-8 w-12 cursor-pointer rounded border border-border"
          />
        </div>

        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="qr-logo">{t("logoLabel")}</Label>
          <input
            id="qr-logo"
            type="checkbox"
            checked={includeLogo}
            onChange={(event) => setIncludeLogo(event.target.checked)}
          />
        </div>

        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="qr-transparent">{t("transparentLabel")}</Label>
          <input
            id="qr-transparent"
            type="checkbox"
            checked={transparent}
            disabled={format === "jpeg"}
            onChange={(event) => setTransparent(event.target.checked)}
          />
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {FORMATS.map((f) => (
          <Button
            key={f}
            type="button"
            size="sm"
            variant={format === f ? "secondary" : "outline"}
            aria-pressed={format === f}
            onClick={() => selectFormat(f)}
          >
            {f.toUpperCase()}
          </Button>
        ))}
      </div>

      <Button variant="outline" onClick={handleDownload}>
        {downloadLabel}
      </Button>
    </div>
  );
}
