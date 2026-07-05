import { NextResponse } from "next/server";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { validateUsername } from "@/utils/validate-username";
import { generateWhatsAppLink } from "@/lib/whatsapp/generateLink";

// Conventional site paths that don't have a dedicated page yet -- reserved so they
// 404 instead of being misread as a WhatsApp username and redirected to wa.me.
const RESERVED_SITE_PATHS = ["about", "privacy", "faq", "contact", "legal", "terms"];

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
