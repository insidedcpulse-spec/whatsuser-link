import type { UsernameValidationResult } from "@/types/whatsapp";

const KEY_REGEX = /^[a-z0-9]{4,8}$/i;

export function validateUsernameKey(key: string): UsernameValidationResult {
  const errors: string[] = [];

  if (!KEY_REGEX.test(key)) {
    errors.push("keyErrors.invalidFormat");
  }

  return { valid: errors.length === 0, errors };
}
