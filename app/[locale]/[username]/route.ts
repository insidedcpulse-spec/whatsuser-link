import { NextResponse } from "next/server";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { validateUsername } from "@/utils/validate-username";
import { generateWhatsAppLink } from "@/lib/whatsapp/generateLink";

// Conventional site paths that have dedicated pages or reserved names -- reserved so they
// don't get misread as a WhatsApp username and redirected to wa.me.
const RESERVED_SITE_PATHS = [
  "about",
  "privacy",
  "faq",
  "contact",
  "legal",
  "terms",
  "dashboard",
  "developers",
  "blog",
  "glossary",
  "how-to-create-a-whatsapp-link",
  "privacy-policy",
  "terms-of-service",
];

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ locale: string; username: string }> }
) {
  const { locale, username } = await params;

  if (!hasLocale(routing.locales, locale)) {
    return new NextResponse("Not found", { status: 404 });
  }

  if (RESERVED_SITE_PATHS.includes(username)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const { valid } = validateUsername(username);

  if (!valid) {
    return new NextResponse("Not found", { status: 404 });
  }

  return NextResponse.redirect(generateWhatsAppLink(username), 307);
}
