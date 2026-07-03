import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";

export const alt = "WhatsUser.link";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  const iconSvg = await readFile(
    path.join(process.cwd(), "public", "chat-icon.svg"),
    "utf-8",
  );
  const iconDataUri = `data:image/svg+xml;base64,${Buffer.from(iconSvg).toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#25d366",
          padding: "80px",
        }}
      >
        <img
          src={iconDataUri}
          alt=""
          width={120}
          height={120}
          style={{ marginBottom: 40 }}
        />
        <div
          style={{
            display: "flex",
            fontSize: 56,
            fontWeight: 700,
            color: "#ffffff",
            textAlign: "center",
            lineHeight: 1.2,
          }}
        >
          {t("title").split("|")[0].trim()}
        </div>
      </div>
    ),
    { ...size },
  );
}
