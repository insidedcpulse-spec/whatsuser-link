export interface ParsedBsuid {
  countryCode: string;
  id: string;
  isParent: boolean;
}

const BSUID_PARSE_REGEX = /^([A-Z]{2})\.(ENT\.)?([A-Za-z0-9]{1,128})$/;

export function parseBsuid(bsuid: string): ParsedBsuid | null {
  const match = BSUID_PARSE_REGEX.exec(bsuid);
  if (!match) return null;
  const [, countryCode, entMarker, id] = match;
  return { countryCode, id, isParent: entMarker !== undefined };
}
