import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { JsonLdScript } from "@/components/json-ld-script";
import { Toaster } from "@/components/ui/sonner";
import { routing } from "@/i18n/routing";
import { siteConfig } from "@/config/site";
import { getSoftwareApplicationJsonLd } from "@/lib/json-ld";
import "../globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });

  return {
    metadataBase: new URL(siteConfig.url),
    title: siteConfig.name,
    description: t("description"),
    alternates: {
      canonical: "/",
    },
    openGraph: {
      title: siteConfig.name,
      description: t("description"),
      url: siteConfig.url,
      siteName: siteConfig.name,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: siteConfig.name,
      description: t("description"),
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const t = await getTranslations({ locale, namespace: "metadata" });

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <JsonLdScript data={getSoftwareApplicationJsonLd(t("description"))} />
        <NextIntlClientProvider>
          <ThemeProvider attribute="class" defaultTheme="light">
            <div className="fixed right-4 top-4 flex items-center gap-2">
              <LocaleSwitcher />
              <ThemeToggle />
            </div>
            {children}
            <Toaster />
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
