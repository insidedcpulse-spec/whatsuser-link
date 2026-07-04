import { NextResponse } from "next/server";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { validateUsername } from "@/utils/validate-username";
import { generateWhatsAppLink } from "@/lib/whatsapp/generateLink";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ locale: string; username: string }> }
) {
  const { locale, username } = await params;

  if (!hasLocale(routing.locales, locale)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const { valid } = validateUsername(username);

  if (!valid) {
    return new NextResponse("Not found", { status: 404 });
  }

  return NextResponse.redirect(generateWhatsAppLink(username), 307);
}
