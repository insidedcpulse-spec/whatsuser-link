export type ContactIdentifierType = "bsuid" | "phone" | "username";

export interface ContactInput {
  bsuid?: string;
  phone?: string;
  username?: string;
}

export interface ResolvedContact {
  id: string;
  type: ContactIdentifierType;
  username: string | null;
  phone: string | null;
  bsuid: string | null;
  displayName: null;
  phoneKnown: boolean;
  bsuidKnown: boolean;
}

const IDENTIFIER_KEYS = ["bsuid", "phone", "username"] as const;

export function resolveContact(input: ContactInput): ResolvedContact | null {
  const provided = IDENTIFIER_KEYS.filter((key) => !!input[key]);
  if (provided.length !== 1) return null;

  const type = provided[0];
  const id = input[type] as string;

  return {
    id,
    type,
    username: type === "username" ? id : null,
    phone: type === "phone" ? id : null,
    bsuid: type === "bsuid" ? id : null,
    displayName: null,
    phoneKnown: type === "phone",
    bsuidKnown: type === "bsuid",
  };
}
