import { createWhatsAppLink } from "@/services/link-service";
import { sanitizeUsernameInput } from "@/utils/validate-username";
import { mapValidationError } from "@/lib/api/error-codes";
import { buildShortLink } from "@/lib/short-link";
import { USERNAME_LINK_NOTICE } from "@/lib/api/responses";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { errorResult, jsonResult } from "./tool-result";

export interface UsernameLinkArgs {
  username: string;
  key?: string;
  text?: string;
}

export function usernameLinkTool(args: UsernameLinkArgs): CallToolResult {
  if (!args.username) {
    return errorResult("missing_username", 'Param "username" is required.');
  }

  const username = sanitizeUsernameInput(args.username);
  const result = createWhatsAppLink(username, args.key, args.text);

  if (!result.success) {
    const { code, message } = mapValidationError(result.errors[0]);
    return errorResult(code, message);
  }

  return jsonResult({
    username: result.link.username,
    ...(result.link.usernameKey ? { key: result.link.usernameKey } : {}),
    link: result.link.url,
    shortLink: buildShortLink(result.link.username),
    notice: USERNAME_LINK_NOTICE,
  });
}
