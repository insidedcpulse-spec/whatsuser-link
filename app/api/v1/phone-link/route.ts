import { createPhoneWhatsAppLink } from "@/services/phone-link-service";
import { sanitizePhoneInput } from "@/utils/validate-phone";
import { mapValidationError } from "@/lib/api/error-codes";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { apiJson, apiError, apiOptions, apiRateLimited } from "@/lib/api/responses";

export async function GET(request: Request): Promise<Response> {
  const rate = await checkRateLimit(request, "json");
  if (!rate.allowed) return apiRateLimited(rate.headers);

  try {
    const { searchParams } = new URL(request.url);
    const rawPhone = searchParams.get("phone");

    if (!rawPhone) {
      return apiError(400, "missing_phone", 'Query param "phone" is required (full international number).', rate.headers);
    }

    const phone = sanitizePhoneInput(rawPhone);
    const text = searchParams.get("text") ?? undefined;

    const result = createPhoneWhatsAppLink(phone, text);

    if (!result.success) {
      const { code, message } = mapValidationError(result.errors[0]);
      return apiError(400, code, message, rate.headers);
    }

    return apiJson({ phone: result.link.phone, link: result.link.url }, rate.headers);
  } catch (error) {
    console.error("[api] phone-link failed:", error);
    return apiError(500, "internal_error", "Unexpected error.", rate.headers);
  }
}

export function OPTIONS(): Response {
  return apiOptions();
}
