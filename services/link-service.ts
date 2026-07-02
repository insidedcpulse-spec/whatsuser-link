import { generateWhatsAppLink } from "@/lib/whatsapp/generateLink";
import { validateUsername } from "@/utils/validate-username";
import { validateUsernameKey } from "@/utils/validate-username-key";
import type { GeneratedLink } from "@/types/whatsapp";

export type LinkGenerationResult =
  | { success: true; link: GeneratedLink }
  | { success: false; errors: string[] };

export function createWhatsAppLink(
  username: string,
  usernameKey?: string,
  message?: string
): LinkGenerationResult {
  const usernameValidation = validateUsername(username);
  const keyValidation = usernameKey
    ? validateUsernameKey(usernameKey)
    : { valid: true, errors: [] as string[] };

  const errors = [...usernameValidation.errors, ...keyValidation.errors];

  if (errors.length > 0) {
    return { success: false, errors };
  }

  const url = generateWhatsAppLink(username, message);

  return {
    success: true,
    link: {
      url,
      username,
      usernameKey: usernameKey?.trim() || undefined,
      message: message?.trim() || undefined,
    },
  };
}
