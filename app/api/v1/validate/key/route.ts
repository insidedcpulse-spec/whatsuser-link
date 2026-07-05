import { validateUsernameKey } from "@/utils/validate-username-key";
import { mapValidationError } from "@/lib/api/error-codes";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { apiJson, apiError, apiOptions, apiRateLimited } from "@/lib/api/responses";

export async function GET(request: Request): Promise<Response> {
  const rate = await checkRateLimit(request, "json");
  if (!rate.allowed) return apiRateLimited(rate.headers);

  const raw = new URL(request.url).searchParams.get("key");
  if (raw === null || raw === "") {
    return apiError(400, "missing_key", 'Query param "key" is required.', rate.headers);
  }

  const validation = validateUsernameKey(raw.trim());
  return apiJson(
    { valid: validation.valid, errors: validation.errors.map(mapValidationError) },
    rate.headers,
  );
}

export function OPTIONS(): Response {
  return apiOptions();
}
