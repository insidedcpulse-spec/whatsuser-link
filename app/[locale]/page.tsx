import { getTranslations } from "next-intl/server";
import { Explainer } from "@/components/explainer";
import { Faq } from "@/components/faq";
import { Hero } from "@/components/hero";
import { PhoneGenerator } from "@/components/whatsapp/phone-generator";
import { UsernameGenerator } from "@/components/whatsapp/username-generator";
import { FeatureGrid } from "@/components/feature-grid";
import { FeaturedArticles } from "@/components/featured-articles";
import { SiteFooter } from "@/components/site-footer";
import { Link } from "@/i18n/navigation";

export default async function Home() {
  const tPhone = await getTranslations("phone");
  const tForm = await getTranslations("form");
  const tGuide = await getTranslations("guide");

  return (
    <div className="flex min-h-screen flex-col justify-between">
      <main className="flex w-full flex-col items-center justify-center gap-12 px-4 py-10 md:py-16">
        <Hero />

        {/* Generator forms side-by-side on desktop */}
        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          <div className="w-full rounded-2xl border bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-center text-base font-semibold text-foreground">{tPhone("sectionTitle")}</h2>
            <PhoneGenerator />
          </div>

          <div className="w-full rounded-2xl border bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-center text-base font-semibold text-foreground">{tForm("sectionTitle")}</h2>
            <UsernameGenerator />
          </div>
        </div>

        {/* Value Propositions & Privacy Features */}
        <FeatureGrid />

        {/* Explainer / Technical Background */}
        <Explainer />

        {/* Featured Blog Posts & Guides */}
        <FeaturedArticles />

        {/* Frequently Asked Questions */}
        <Faq />

        {/* Direct link to step-by-step guide */}
        <div className="my-2 text-center">
          <Link
            href="/how-to-create-a-whatsapp-link"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-5 py-2.5 text-sm font-medium text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 transition-colors shadow-xs"
          >
            📖 {tGuide("linkLabel")} →
          </Link>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
