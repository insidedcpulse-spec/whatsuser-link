import QRCode from "qrcode";

export interface QrOptions {
  content: string;
  format: "png" | "svg";
  /** Pixel width — PNG only; SVG is inherently scalable. */
  size: number;
  /** Foreground, "#RRGGBB" or "#RRGGBBAA". */
  color: string;
  /** Background, "#RRGGBB" or "#RRGGBBAA" (use alpha 00 for transparent). */
  background: string;
}

export interface QrOutput {
  body: string | Uint8Array<ArrayBuffer>;
  contentType: "image/svg+xml" | "image/png";
}

export async function generateQr(options: QrOptions): Promise<QrOutput> {
  const colorConfig = { dark: options.color, light: options.background };

  if (options.format === "svg") {
    const svg = await QRCode.toString(options.content, {
      type: "svg",
      margin: 2,
      color: colorConfig,
    });
    return { body: svg, contentType: "image/svg+xml" };
  }

  const buffer = await QRCode.toBuffer(options.content, {
    type: "png",
    width: options.size,
    margin: 2,
    color: colorConfig,
  });
  return { body: new Uint8Array(buffer), contentType: "image/png" };
}
