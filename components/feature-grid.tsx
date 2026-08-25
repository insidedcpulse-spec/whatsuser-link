import { useTranslations } from "next-intl";
import { ShieldCheck, Zap, Code, QrCode } from "lucide-react";

export function FeatureGrid() {
  const t = useTranslations("features");

  const features = [
    {
      icon: ShieldCheck,
      title: t("statelessTitle"),
      description: t("statelessDesc"),
    },
    {
      icon: QrCode,
      title: t("qrTitle"),
      description: t("qrDesc"),
    },
    {
      icon: Zap,
      title: t("formatTitle"),
      description: t("formatDesc"),
    },
    {
      icon: Code,
      title: t("apiTitle"),
      description: t("apiDesc"),
    },
  ];

  return (
    <section className="w-full max-w-4xl py-6">
      <div className="text-center mb-8">
        <h2 className="text-xl font-bold tracking-tight text-foreground">{t("title")}</h2>
        <p className="text-xs text-muted-foreground mt-1 max-w-lg mx-auto">
          {t("subtitle")}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {features.map((feat) => {
          const Icon = feat.icon;
          return (
            <div key={feat.title} className="flex gap-3.5 p-4 rounded-xl border bg-card hover:bg-accent/40 transition-colors">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex flex-col gap-1">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  {feat.title}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {feat.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
