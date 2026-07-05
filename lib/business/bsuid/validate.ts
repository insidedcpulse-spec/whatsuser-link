export interface BsuidValidationResult {
  valid: boolean;
  isParent: boolean;
}

const BSUID_REGEX = /^[A-Z]{2}\.(ENT\.)?[A-Za-z0-9]{1,128}$/;

export function validateBsuid(bsuid: string): BsuidValidationResult {
  const valid = BSUID_REGEX.test(bsuid);
  return { valid, isParent: valid && bsuid.includes(".ENT.") };
}
