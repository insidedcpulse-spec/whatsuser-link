"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Menu, X, Link2, BookOpen, Code, FileText, Info, Mail } from "lucide-react";

export function Navbar() {
  const t = useTranslations("footer");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 sm:h-16 max-w-6xl items-center justify-between px-3 sm:px-4">
        {/* Brand / Logo */}
        <Link href="/" className="flex items-center gap-1.5 sm:gap-2 font-bold text-base sm:text-lg tracking-tight text-primary shrink-0">
          <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-emerald-600 text-white font-semibold text-xs sm:text-sm shadow-xs">
            W
          </div>
          <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
            WhatsUsernames
          </span>
          <span className="hidden xs:inline text-xs font-mono text-muted-foreground font-normal">.link</span>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-5 text-sm font-medium text-muted-foreground">
          <Link href="/" className="hover:text-foreground transition-colors flex items-center gap-1.5">
            <Link2 className="h-4 w-4" />
            <span>Generator</span>
          </Link>
          <Link href="/how-to-create-a-whatsapp-link" className="hover:text-foreground transition-colors flex items-center gap-1.5">
            <BookOpen className="h-4 w-4" />
            <span>{t("guideLink") || "Guide"}</span>
          </Link>
          <Link href="/blog" className="hover:text-foreground transition-colors flex items-center gap-1.5">
            <FileText className="h-4 w-4" />
            <span>{t("blogLink")}</span>
          </Link>
          <Link href="/developers" className="hover:text-foreground transition-colors flex items-center gap-1.5">
            <Code className="h-4 w-4" />
            <span>{t("apiLink")}</span>
          </Link>
          <Link href="/glossary" className="hover:text-foreground transition-colors flex items-center gap-1.5">
            <BookOpen className="h-4 w-4" />
            <span>{t("glossaryLink")}</span>
          </Link>
          <Link href="/about" className="hover:text-foreground transition-colors flex items-center gap-1.5">
            <Info className="h-4 w-4" />
            <span>{t("aboutLink")}</span>
          </Link>
          <Link href="/contact" className="hover:text-foreground transition-colors flex items-center gap-1.5">
            <Mail className="h-4 w-4" />
            <span>{t("contactLink")}</span>
          </Link>
        </nav>

        {/* Actions (Locale, Theme, Mobile Menu Toggle) */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <LocaleSwitcher />
          <ThemeToggle />

          {/* Mobile Hamburger Button */}
          <button
            type="button"
            className="md:hidden flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg hover:bg-accent text-foreground transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="h-4 w-4 sm:h-4.5 sm:w-4.5" /> : <Menu className="h-4 w-4 sm:h-4.5 sm:w-4.5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b bg-background px-4 py-4 space-y-3 shadow-lg animate-in slide-in-from-top-2">
          <Link
            href="/"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 py-2 text-sm font-medium hover:text-primary transition-colors border-b border-border/40"
          >
            <Link2 className="h-4 w-4 text-emerald-600" />
            <span>Generator</span>
          </Link>
          <Link
            href="/how-to-create-a-whatsapp-link"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 py-2 text-sm font-medium hover:text-primary transition-colors border-b border-border/40"
          >
            <BookOpen className="h-4 w-4 text-emerald-600" />
            <span>{t("guideLink") || "Guide"}</span>
          </Link>
          <Link
            href="/blog"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 py-2 text-sm font-medium hover:text-primary transition-colors border-b border-border/40"
          >
            <FileText className="h-4 w-4 text-emerald-600" />
            <span>{t("blogLink")}</span>
          </Link>
          <Link
            href="/developers"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 py-2 text-sm font-medium hover:text-primary transition-colors border-b border-border/40"
          >
            <Code className="h-4 w-4 text-emerald-600" />
            <span>{t("apiLink")}</span>
          </Link>
          <Link
            href="/glossary"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 py-2 text-sm font-medium hover:text-primary transition-colors border-b border-border/40"
          >
            <BookOpen className="h-4 w-4 text-emerald-600" />
            <span>{t("glossaryLink")}</span>
          </Link>
          <Link
            href="/about"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 py-2 text-sm font-medium hover:text-primary transition-colors border-b border-border/40"
          >
            <Info className="h-4 w-4 text-emerald-600" />
            <span>{t("aboutLink")}</span>
          </Link>
          <Link
            href="/contact"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 py-2 text-sm font-medium hover:text-primary transition-colors"
          >
            <Mail className="h-4 w-4 text-emerald-600" />
            <span>{t("contactLink")}</span>
          </Link>
        </div>
      )}
    </header>
  );
}
