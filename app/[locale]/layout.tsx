import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { JsonLdScript } from "@/components/json-ld-script";
import { Navbar } from "@/components/navbar";
import { Toaster } from "@/components/ui/sonner";
import { routing } from "@/i18n/routing";
import { siteConfig } from "@/config/site";
import {
  getOrganizationJsonLd,
  getSoftwareApplicationJsonLd,
  getWebSiteJsonLd,
} from "@/lib/json-ld";
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
  const path = locale === routing.defaultLocale ? "/" : `/${locale}`;

  return {
    metadataBase: new URL(siteConfig.url),
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: path,
      languages: {
        en: "/",
        pt: "/pt",
        es: "/es",
        "x-default": "/",
      },
    },
    openGraph: {
      title: t("title"),
      description: t("description"),
      url: path,
      siteName: siteConfig.name,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("description"),
    },
    verification: {
      google: "gYPPLlUEVYE-N4oM9iWfRcb-xBilyCw9IhAgRN09ZCw",
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
      <head
        dangerouslySetInnerHTML={{
          __html:
            '<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5219655673819952" crossorigin="anonymous"></script>',
        }}
      />
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}>
        <JsonLdScript data={getSoftwareApplicationJsonLd(t("description"))} />
        <JsonLdScript data={getOrganizationJsonLd()} />
        <JsonLdScript data={getWebSiteJsonLd()} />
        <NextIntlClientProvider>
          <ThemeProvider attribute="class" defaultTheme="light">
            <Navbar />
            <div className="flex-1">
              {children}
            </div>
            <Toaster />
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
