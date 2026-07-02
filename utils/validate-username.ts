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
    errors.push(`O username deve ter entre ${MIN_LENGTH} e ${MAX_LENGTH} caracteres.`);
  }

  if (!ALLOWED_CHARS_REGEX.test(username)) {
    errors.push("O username só pode conter letras minúsculas, números, pontos e underscores.");
  }

  if (!HAS_LETTER_REGEX.test(username)) {
    errors.push("O username deve conter pelo menos uma letra.");
  }

  if (username.startsWith("www.")) {
    errors.push('O username não pode começar com "www.".');
  }

  if (RESERVED_DOMAIN_SUFFIXES.some((suffix) => username.endsWith(suffix))) {
    errors.push("O username não pode terminar como um domínio (ex: .com, .net).");
  }

  return { valid: errors.length === 0, errors };
}
