import { sanitizeUsernameInput, validateUsername } from "@/utils/validate-username";
import { mapValidationError } from "@/lib/api/error-codes";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { errorResult, jsonResult } from "./tool-result";

export interface ValidateUsernameArgs {
  username: string;
}

export function validateUsernameTool(args: ValidateUsernameArgs): CallToolResult {
  if (!args.username) {
    return errorResult("missing_username", 'Param "username" is required.');
  }

  const validation = validateUsername(sanitizeUsernameInput(args.username));
  return jsonResult({
    valid: validation.valid,
    errors: validation.errors.map(mapValidationError),
  });
}
