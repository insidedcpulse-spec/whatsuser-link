/**
 * The UI validators return next-intl message keys. The public API must never
 * leak those (they're an internal concern and not stable); this table maps
 * each key to a frozen, documented API error code. v1 codes must never change.
 */
export interface ApiErrorDetail {
  code: string;
  message: string;
}

const ERROR_MAP: Record<string, ApiErrorDetail> = {
  "errors.length": {
    code: "username_length",
    message: "Username must be 3-35 characters.",
  },
  "errors.invalidChars": {
    code: "username_invalid_chars",
    message: "Username may only contain lowercase letters, numbers, dots, and underscores.",
  },
  "errors.noLetter": {
    code: "username_no_letter",
    message: "Username must contain at least one letter.",
  },
  "errors.startsWithWww": {
    code: "username_starts_with_www",
    message: 'Username cannot start with "www.".',
  },
  "errors.reservedDomain": {
    code: "username_reserved_suffix",
    message: "Username cannot end with a reserved domain or file extension.",
  },
  "keyErrors.invalidFormat": {
    code: "key_invalid_format",
    message: "Key must be 4-8 letters or numbers.",
  },
  "phoneErrors.invalidFormat": {
    code: "phone_invalid_format",
    message: "Phone must be 8-15 digits including country code (digits only, no spaces or symbols).",
  },
};

export const ALL_MAPPED_I18N_KEYS = Object.keys(ERROR_MAP);

export function mapValidationError(i18nKey: string): ApiErrorDetail {
  return ERROR_MAP[i18nKey] ?? { code: "invalid_input", message: "Invalid input." };
}
