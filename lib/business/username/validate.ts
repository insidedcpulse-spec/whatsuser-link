export type UsernameValidationReason =
  | "too_short"
  | "too_long"
  | "no_letter"
  | "leading_or_trailing_dot"
  | "consecutive_dots"
  | "leading_www"
  | "reserved_domain_suffix"
  | "invalid_character";

export interface UsernameValidationResult {
  valid: boolean;
  reasons: UsernameValidationReason[];
}

const MIN_LENGTH = 3;
const MAX_LENGTH = 35;
const CHARSET_REGEX = /^[a-z0-9._]+$/i;
const HAS_LETTER_REGEX = /[a-zA-Z]/;
const RESERVED_DOMAIN_SUFFIXES = [".com", ".org", ".net", ".int", ".edu", ".gov", ".mil", ".us", ".in", ".html"];

export function validateBusinessUsername(username: string): UsernameValidationResult {
  const reasons: UsernameValidationReason[] = [];

  if (username.length < MIN_LENGTH) {
    reasons.push("too_short");
  } else if (username.length > MAX_LENGTH) {
    reasons.push("too_long");
  }

  if (!CHARSET_REGEX.test(username)) reasons.push("invalid_character");
  if (!HAS_LETTER_REGEX.test(username)) reasons.push("no_letter");
  if (username.startsWith(".") || username.endsWith(".")) reasons.push("leading_or_trailing_dot");
  if (username.includes("..")) reasons.push("consecutive_dots");
  if (username.toLowerCase().startsWith("www")) reasons.push("leading_www");
  if (RESERVED_DOMAIN_SUFFIXES.some((suffix) => username.toLowerCase().endsWith(suffix))) {
    reasons.push("reserved_domain_suffix");
  }

  return { valid: reasons.length === 0, reasons };
}
