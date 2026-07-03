import { getTranslations } from "next-intl/server";
import { Hero } from "@/components/hero";
import { UsernameGenerator } from "@/components/whatsapp/username-generator";

export default async function Home() {
  const t = await getTranslations("footer");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-12 px-4 py-24">
      <Hero />
      <div className="w-full max-w-md">
        <UsernameGenerator />
      </div>
      <p className="max-w-md text-center text-xs text-muted-foreground">{t("disclaimer")}</p>
    </main>
  );
}
