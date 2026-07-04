import { createWhatsAppLink } from "@/services/link-service";
import { sanitizeUsernameInput } from "@/utils/validate-username";
import { mapValidationError } from "@/lib/api/error-codes";
import { checkRateLimit } from "@/lib/api/rate-limit";
import {
  apiJson,
  apiError,
  apiOptions,
  apiRateLimited,
  USERNAME_LINK_NOTICE,
} from "@/lib/api/responses";
import { buildShortLink } from "@/lib/short-link";

export async function GET(request: Request): Promise<Response> {
  const rate = await checkRateLimit(request, "json");
  if (!rate.allowed) return apiRateLimited(rate.headers);

  try {
    const { searchParams } = new URL(request.url);
    const rawUsername = searchParams.get("username");

    if (!rawUsername) {
      return apiError(400, "missing_username", 'Query param "username" is required.', rate.headers);
    }

    const username = sanitizeUsernameInput(rawUsername);
    const key = searchParams.get("key") ?? undefined;
    const text = searchParams.get("text") ?? undefined;

    const result = createWhatsAppLink(username, key, text);

    if (!result.success) {
      const { code, message } = mapValidationError(result.errors[0]);
      return apiError(400, code, message, rate.headers);
    }

    return apiJson(
      {
        username: result.link.username,
        ...(result.link.usernameKey ? { key: result.link.usernameKey } : {}),
        link: result.link.url,
        shortLink: buildShortLink(result.link.username),
        notice: USERNAME_LINK_NOTICE,
      },
      rate.headers,
    );
  } catch (error) {
    console.error("[api] username-link failed:", error);
    return apiError(500, "internal_error", "Unexpected error.", rate.headers);
  }
}

export function OPTIONS(): Response {
  return apiOptions();
}
