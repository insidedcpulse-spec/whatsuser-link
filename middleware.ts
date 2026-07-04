import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

const intlMiddleware = createMiddleware(routing);

/**
 * Covers all Portuguese- and Spanish-speaking countries this site has
 * translations for (pt, es). Everything else falls back to English.
 */
const GEO_LOCALE_MAP: Record<string, string> = {
  // Portuguese-speaking
  PT: "pt",
  BR: "pt",
  AO: "pt",
  MZ: "pt",
  CV: "pt",
  GW: "pt",
  ST: "pt",
  TL: "pt",
  // Spanish-speaking
  ES: "es",
  MX: "es",
  AR: "es",
  CO: "es",
  CL: "es",
  PE: "es",
  VE: "es",
  EC: "es",
  GT: "es",
  CU: "es",
  BO: "es",
  DO: "es",
  HN: "es",
  PY: "es",
  SV: "es",
  NI: "es",
  CR: "es",
  PA: "es",
  UY: "es",
  PR: "es",
  GQ: "es",
};

export default function middleware(request: NextRequest) {
  const hasAcceptLanguage = Boolean(request.headers.get("accept-language"));
  const hasLocaleCookie = Boolean(request.cookies.get("NEXT_LOCALE"));
  const alreadyHasLocalePrefix = routing.locales.some(
    (locale) =>
      request.nextUrl.pathname === `/${locale}` ||
      request.nextUrl.pathname.startsWith(`/${locale}/`)
  );

  if (!hasAcceptLanguage && !hasLocaleCookie && !alreadyHasLocalePrefix) {
    const country = request.headers.get("x-vercel-ip-country");
    const geoLocale = country ? GEO_LOCALE_MAP[country] : undefined;

    if (geoLocale && geoLocale !== routing.defaultLocale) {
      const url = request.nextUrl.clone();
      url.pathname = `/${geoLocale}${request.nextUrl.pathname}`;
      return NextResponse.redirect(url);
    }
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: [
    "/((?!api|_next|_vercel|.*\\.(?:ico|png|jpg|jpeg|gif|svg|css|js|mjs|map|json|txt|xml|html|webmanifest|woff|woff2|ttf)$).*)",
  ],
};
