import { generateWhatsAppLink } from "@/lib/whatsapp/generateLink";
import { validateUsername } from "@/utils/validate-username";
import type { GeneratedLink, UsernameValidationResult } from "@/types/whatsapp";

export type LinkGenerationResult =
  | { success: true; link: GeneratedLink }
  | { success: false; validation: UsernameValidationResult };

export function createWhatsAppLink(username: string, message?: string): LinkGenerationResult {
  const validation = validateUsername(username);

  if (!validation.valid) {
    return { success: false, validation };
  }

  const url = generateWhatsAppLink(username, message);

  return {
    success: true,
    link: { url, username, message: message?.trim() || undefined },
  };
}
