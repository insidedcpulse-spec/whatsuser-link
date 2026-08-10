import { sanitizePhoneInput, validatePhoneNumber } from "@/utils/validate-phone";
import { mapValidationError } from "@/lib/api/error-codes";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { errorResult, jsonResult } from "./tool-result";

export interface ValidatePhoneArgs {
  phone: string;
}

export function validatePhoneTool(args: ValidatePhoneArgs): CallToolResult {
  if (!args.phone) {
    return errorResult("missing_phone", 'Param "phone" is required.');
  }

  const validation = validatePhoneNumber(sanitizePhoneInput(args.phone));
  return jsonResult({
    valid: validation.valid,
    errors: validation.errors.map(mapValidationError),
  });
}
