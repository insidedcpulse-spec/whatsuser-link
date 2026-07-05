import { normalizeWebhook } from "@/lib/business/webhook/normalize";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { apiJson, apiError, apiOptions, apiRateLimited } from "@/lib/api/responses";

export async function POST(request: Request): Promise<Response> {
  const rate = await checkRateLimit(request, "json");
  if (!rate.allowed) return apiRateLimited(rate.headers);

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return apiError(400, "webhook_invalid_json", "Request body must be valid JSON.", rate.headers);
  }

  const result = normalizeWebhook(raw);
  if (!result) {
    return apiError(
      422,
      "webhook_unrecognized_shape",
      "Payload does not match any known WhatsApp Cloud API webhook shape.",
      rate.headers,
    );
  }

  return apiJson(result, rate.headers);
}

export function OPTIONS(): Response {
  return apiOptions();
}
