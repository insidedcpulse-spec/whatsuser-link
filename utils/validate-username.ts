import type { UsernameValidationResult } from "@/types/whatsapp";

const MIN_LENGTH = 3;
const MAX_LENGTH = 35;
const ALLOWED_CHARS_REGEX = /^[a-z0-9._]*$/;
const HAS_LETTER_REGEX = /[a-z]/;
const RESERVED_DOMAIN_SUFFIXES = [".com", ".net", ".org", ".io", ".co", ".app"];

export function sanitizeUsernameInput(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/^@+/, "")
    .replace(/\s+/g, "")
    .split("")
    .filter((char) => /[a-z0-9._]/.test(char))
    .join("");
}

export function validateUsername(username: string): UsernameValidationResult {
  const errors: string[] = [];

  if (username.length < MIN_LENGTH || username.length > MAX_LENGTH) {
    errors.push("errors.length");
  }

  if (!ALLOWED_CHARS_REGEX.test(username)) {
    errors.push("errors.invalidChars");
  }

  if (!HAS_LETTER_REGEX.test(username)) {
    errors.push("errors.noLetter");
  }

  if (username.startsWith("www.")) {
    errors.push("errors.startsWithWww");
  }

  if (RESERVED_DOMAIN_SUFFIXES.some((suffix) => username.endsWith(suffix))) {
    errors.push("errors.reservedDomain");
  }

  return { valid: errors.length === 0, errors };
}
