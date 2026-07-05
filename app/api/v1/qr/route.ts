import { createWhatsAppLink } from "@/services/link-service";
import { createPhoneWhatsAppLink } from "@/services/phone-link-service";
import { sanitizeUsernameInput } from "@/utils/validate-username";
import { sanitizePhoneInput } from "@/utils/validate-phone";
import { mapValidationError } from "@/lib/api/error-codes";
import { checkRateLimit } from "@/lib/api/rate-limit";
import {
  apiError,
  apiOptions,
  apiRateLimited,
  API_CORS_HEADERS,
  API_SUCCESS_CACHE_CONTROL,
} from "@/lib/api/responses";
import { generateQr } from "@/lib/qr/generate-qr";

const HEX_COLOR_REGEX = /^[0-9a-fA-F]{6}$/;
const MIN_SIZE = 128;
const MAX_SIZE = 1024;

export async function GET(request: Request): Promise<Response> {
  const rate = await checkRateLimit(request, "qr");
  if (!rate.allowed) return apiRateLimited(rate.headers);

  try {
    const { searchParams } = new URL(request.url);
    const rawUsername = searchParams.get("username");
    const rawPhone = searchParams.get("phone");

    // Exactly one target: XOR — reject both-present and both-absent.
    if ((rawUsername === null) === (rawPhone === null)) {
      return apiError(400, "missing_target", 'Provide exactly one of "username" or "phone".', rate.headers);
    }

    const text = searchParams.get("text") ?? undefined;

    let link: string;
    if (rawUsername !== null) {
      const result = createWhatsAppLink(sanitizeUsernameInput(rawUsername), undefined, text);
      if (!result.success) {
        const { code, message } = mapValidationError(result.errors[0]);
        return apiError(400, code, message, rate.headers);
      }
      link = result.link.url;
    } else {
      const result = createPhoneWhatsAppLink(sanitizePhoneInput(rawPhone as string), text);
      if (!result.success) {
        const { code, message } = mapValidationError(result.errors[0]);
        return apiError(400, code, message, rate.headers);
      }
      link = result.link.url;
    }

    const format = searchParams.get("format") ?? "png";
    if (format !== "png" && format !== "svg") {
      return apiError(400, "invalid_format", 'format must be "png" or "svg".', rate.headers);
    }

    const size = Number(searchParams.get("size") ?? "512");
    if (!Number.isInteger(size) || size < MIN_SIZE || size > MAX_SIZE) {
      return apiError(400, "invalid_size", `size must be an integer between ${MIN_SIZE} and ${MAX_SIZE}.`, rate.headers);
    }

    const color = searchParams.get("color") ?? "000000";
    if (!HEX_COLOR_REGEX.test(color)) {
      return apiError(400, "invalid_color", "color must be a 6-digit hex value without #.", rate.headers);
    }

    const bg = searchParams.get("bg") ?? "ffffff";
    if (bg !== "transparent" && !HEX_COLOR_REGEX.test(bg)) {
      return apiError(400, "invalid_bg", 'bg must be a 6-digit hex value without #, or "transparent".', rate.headers);
    }

    const qr = await generateQr({
      content: link,
      format,
      size,
      color: `#${color}`,
      background: bg === "transparent" ? "#ffffff00" : `#${bg}`,
    });

    return new Response(qr.body, {
      headers: {
        ...API_CORS_HEADERS,
        "Content-Type": qr.contentType,
        "Cache-Control": API_SUCCESS_CACHE_CONTROL,
        ...rate.headers,
      },
    });
  } catch (error) {
    console.error("[api] qr failed:", error);
    return apiError(500, "internal_error", "Unexpected error.", rate.headers);
  }
}

export function OPTIONS(): Response {
  return apiOptions();
}
