import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ShieldCheck, Code2, BookOpen, Lock } from "lucide-react";

export async function SiteFooter() {
  const t = await getTranslations("footer");

  return (
    <footer className="w-full border-t bg-muted/40 text-muted-foreground mt-16">
      <div className="container mx-auto max-w-6xl px-4 py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Col 1: About Brand & E-E-A-T badge */}
          <div className="flex flex-col gap-3 md:col-span-1">
            <div className="flex items-center gap-2 text-foreground font-bold text-base">
              <div className="flex h-7 w-7 items-center justify-center rounded bg-emerald-600 text-white font-semibold text-xs shadow-sm">
                W
              </div>
              <span>WhatsUsernames.link</span>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Free, independent, and stateless generator for WhatsApp @Usernames, wa.me links, and downloadable QR codes.
            </p>
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              <Lock className="h-3.5 w-3.5" />
              <span>100% Stateless & Private</span>
            </div>
          </div>

          {/* Col 2: Free Tools & API */}
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <Code2 className="h-3.5 w-3.5 text-emerald-600" />
              Tools & API
            </h3>
            <ul className="space-y-1.5 text-xs">
              <li>
                <Link href="/" className="hover:text-foreground transition-colors">
                  WhatsApp Username Link Generator
                </Link>
              </li>
              <li>
                <Link href="/" className="hover:text-foreground transition-colors">
                  Phone Click-to-Chat Link Generator
                </Link>
              </li>
              <li>
                <Link href="/developers" className="hover:text-foreground transition-colors">
                  Free REST API for Developers
                </Link>
              </li>
              <li>
                <Link href="/developers" className="hover:text-foreground transition-colors">
                  WhatsApp Business BSUID Tools
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Guides & Content Hub */}
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5 text-emerald-600" />
              Guides & Content
            </h3>
            <ul className="space-y-1.5 text-xs">
              <li>
                <Link href="/how-to-create-a-whatsapp-link" className="hover:text-foreground transition-colors">
                  {t("guideLink") || "How to Create a WhatsApp Link"}
                </Link>
              </li>
              <li>
                <Link href="/blog" className="hover:text-foreground transition-colors">
                  {t("blogLink")} — WhatsApp Articles
                </Link>
              </li>
              <li>
                <Link href="/glossary" className="hover:text-foreground transition-colors">
                  {t("glossaryLink")} — WhatsApp Terms
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Trust, E-E-A-T & Legal */}
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              Transparency & Legal
            </h3>
            <ul className="space-y-1.5 text-xs">
              <li>
                <Link href="/about" className="hover:text-foreground transition-colors">
                  {t("aboutLink")}
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-foreground transition-colors">
                  {t("contactLink")}
                </Link>
              </li>
              <li>
                <Link href="/privacy-policy" className="hover:text-foreground transition-colors">
                  {t("privacyLink")}
                </Link>
              </li>
              <li>
                <Link href="/terms-of-service" className="hover:text-foreground transition-colors">
                  {t("termsLink")}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar & Disclaimer */}
        <div className="mt-8 border-t pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left text-xs">
          <p className="max-w-xl text-muted-foreground">{t("disclaimer")}</p>
          <p className="text-muted-foreground font-mono text-[11px]">
            © {new Date().getFullYear()} WhatsUsernames.link. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
