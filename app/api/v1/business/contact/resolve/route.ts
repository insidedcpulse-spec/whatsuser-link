import { resolveContact } from "@/lib/business/contact/resolve";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { apiJson, apiError, apiOptions, apiRateLimited } from "@/lib/api/responses";

function stringOrUndefined(value: unknown): string | undefined {
  return typeof value === "string" && value !== "" ? value : undefined;
}

export async function POST(request: Request): Promise<Response> {
  const rate = await checkRateLimit(request, "json");
  if (!rate.allowed) return apiRateLimited(rate.headers);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(400, "invalid_json", "Request body must be valid JSON.", rate.headers);
  }

  const raw = (body && typeof body === "object" ? body : {}) as {
    bsuid?: unknown;
    phone?: unknown;
    username?: unknown;
  };
  const result = resolveContact({
    bsuid: stringOrUndefined(raw.bsuid),
    phone: stringOrUndefined(raw.phone),
    username: stringOrUndefined(raw.username),
  });

  if (!result) {
    return apiError(400, "missing_identifier", "Provide exactly one of bsuid, phone, or username.", rate.headers);
  }

  return apiJson(result, rate.headers);
}

export function OPTIONS(): Response {
  return apiOptions();
}
