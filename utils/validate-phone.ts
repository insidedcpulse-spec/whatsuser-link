import type { UsernameValidationResult } from "@/types/whatsapp";

const MIN_DIGITS = 8;
const MAX_DIGITS = 15;

export function sanitizePhoneInput(raw: string): string {
  return raw.replace(/\D/g, "").replace(/^0/, "");
}

// Reuses the generic { valid, errors } shape from the username feature —
// not worth a codebase-wide rename just for this.
export function validatePhoneNumber(phone: string): UsernameValidationResult {
  const errors: string[] = [];

  if (phone.length < MIN_DIGITS || phone.length > MAX_DIGITS) {
    errors.push("phoneErrors.invalidFormat");
  }

  return { valid: errors.length === 0, errors };
}
