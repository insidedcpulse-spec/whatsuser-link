import { validateBsuid } from "@/lib/business/bsuid/validate";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { apiJson, apiError, apiOptions, apiRateLimited } from "@/lib/api/responses";

export async function POST(request: Request): Promise<Response> {
  const rate = await checkRateLimit(request, "json");
  if (!rate.allowed) return apiRateLimited(rate.headers);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(400, "invalid_json", "Request body must be valid JSON.", rate.headers);
  }

  const bsuid = body && typeof body === "object" ? (body as { bsuid?: unknown }).bsuid : undefined;
  if (typeof bsuid !== "string" || bsuid === "") {
    return apiError(400, "missing_bsuid", '"bsuid" field is required.', rate.headers);
  }

  return apiJson(validateBsuid(bsuid), rate.headers);
}

export function OPTIONS(): Response {
  return apiOptions();
}
