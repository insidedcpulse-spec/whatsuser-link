import { createPhoneWhatsAppLink } from "@/services/phone-link-service";
import { sanitizePhoneInput } from "@/utils/validate-phone";
import { mapValidationError } from "@/lib/api/error-codes";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { errorResult, jsonResult } from "./tool-result";

export interface PhoneLinkArgs {
  phone: string;
  text?: string;
}

export function phoneLinkTool(args: PhoneLinkArgs): CallToolResult {
  if (!args.phone) {
    return errorResult("missing_phone", 'Param "phone" is required (full international number).');
  }

  const phone = sanitizePhoneInput(args.phone);
  const result = createPhoneWhatsAppLink(phone, args.text);

  if (!result.success) {
    const { code, message } = mapValidationError(result.errors[0]);
    return errorResult(code, message);
  }

  return jsonResult({ phone: result.link.phone, link: result.link.url });
}
