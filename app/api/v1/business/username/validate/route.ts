import { validateBusinessUsername } from "@/lib/business/username/validate";
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

  const username = body && typeof body === "object" ? (body as { username?: unknown }).username : undefined;
  if (typeof username !== "string" || username === "") {
    return apiError(400, "missing_username", '"username" field is required.', rate.headers);
  }

  return apiJson(validateBusinessUsername(username), rate.headers);
}

export function OPTIONS(): Response {
  return apiOptions();
}
