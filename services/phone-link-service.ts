import { generatePhoneWhatsAppLink } from "@/lib/whatsapp/generatePhoneLink";
import { validatePhoneNumber } from "@/utils/validate-phone";
import type { GeneratedPhoneLink } from "@/types/whatsapp";

export type PhoneLinkGenerationResult =
  | { success: true; link: GeneratedPhoneLink }
  | { success: false; errors: string[] };

export function createPhoneWhatsAppLink(
  phone: string,
  message?: string
): PhoneLinkGenerationResult {
  const validation = validatePhoneNumber(phone);

  if (!validation.valid) {
    return { success: false, errors: validation.errors };
  }

  const url = generatePhoneWhatsAppLink(phone, message);

  return {
    success: true,
    link: { url, phone, message: message?.trim() || undefined },
  };
}
