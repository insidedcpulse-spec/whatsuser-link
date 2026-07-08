import { getTranslations } from "next-intl/server";
import { AdBanner } from "@/components/ad-banner";
import { Faq } from "@/components/faq";
import { Hero } from "@/components/hero";
import { PhoneGenerator } from "@/components/whatsapp/phone-generator";
import { UsernameGenerator } from "@/components/whatsapp/username-generator";
import { Link } from "@/i18n/navigation";

export default async function Home() {
  const t = await getTranslations("footer");
  const tPhone = await getTranslations("phone");
  const tForm = await getTranslations("form");
  const tGuide = await getTranslations("guide");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-12 px-4 py-24">
      <Hero />

      {/*
        TEMPORÁRIO: confirmámos em 2026-07-03 (servidor + telemóvel real)
        que wa.me/<username> ainda não abre conversa. Este bloco dá aos
        visitantes um link que funciona hoje. Remover quando o link de
        username for confirmado a funcionar — o gerador abaixo volta a
        ser o único/principal.
      */}
      <div className="w-full max-w-md">
        <h2 className="mb-4 text-center text-lg font-semibold">{tPhone("sectionTitle")}</h2>
        <PhoneGenerator />
      </div>

      <div className="w-full max-w-md">
        <h2 className="mb-4 text-center text-lg font-semibold">{tForm("sectionTitle")}</h2>
        <UsernameGenerator />
      </div>

      <AdBanner />

      <Faq />

      <Link
        href="/how-to-create-a-whatsapp-link"
        className="text-sm text-muted-foreground underline underline-offset-4"
      >
        {tGuide("linkLabel")}
      </Link>

      <div className="flex flex-wrap justify-center gap-4 text-xs text-muted-foreground">
        <Link href="/about" className="underline underline-offset-4">
          {t("aboutLink")}
        </Link>
        <Link href="/contact" className="underline underline-offset-4">
          {t("contactLink")}
        </Link>
        <Link href="/developers" className="underline underline-offset-4">
          {t("apiLink")}
        </Link>
        <Link href="/blog" className="underline underline-offset-4">
          {t("blogLink")}
        </Link>
        <Link href="/privacy-policy" className="underline underline-offset-4">
          {t("privacyLink")}
        </Link>
        <Link href="/terms-of-service" className="underline underline-offset-4">
          {t("termsLink")}
        </Link>
      </div>

      <p className="max-w-md text-center text-xs text-muted-foreground">{t("disclaimer")}</p>
    </main>
  );
}
