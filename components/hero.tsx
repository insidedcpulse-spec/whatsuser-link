import { useTranslations } from "next-intl";

export function Hero() {
  const t = useTranslations("hero");

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{t("title")}</h1>
      <p className="max-w-lg text-lg text-muted-foreground">{t("subtitle")}</p>
    </div>
  );
}
