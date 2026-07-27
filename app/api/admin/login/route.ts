import { verifyAdminPassword, setAdminSession } from "@/lib/auth";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { apiJson, apiError, apiRateLimited } from "@/lib/api/responses";

export async function POST(request: Request): Promise<Response> {
  const rate = await checkRateLimit(request, "json");
  if (!rate.allowed) return apiRateLimited(rate.headers);

  try {
    const body = await request.json().catch(() => ({}));
    const password = typeof body?.password === "string" ? body.password : "";

    const isValid = await verifyAdminPassword(password);
    if (!isValid) {
      return apiError(401, "invalid_password", "Palavra-passe incorreta.", rate.headers);
    }

    await setAdminSession();
    return apiJson({ success: true }, rate.headers);
  } catch (error) {
    console.error("[api] admin login failed:", error);
    return apiError(500, "internal_error", "Erro ao efetuar login.", rate.headers);
  }
}
