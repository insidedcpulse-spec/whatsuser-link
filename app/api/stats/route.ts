import { getDashboardStats } from "@/lib/stats";
import { isAuthenticated } from "@/lib/auth";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { apiJson, apiError, apiRateLimited } from "@/lib/api/responses";

export async function GET(request: Request): Promise<Response> {
  const rate = await checkRateLimit(request, "json");
  if (!rate.allowed) return apiRateLimited(rate.headers);

  const auth = await isAuthenticated();
  if (!auth) {
    return apiError(401, "unauthorized", "Autenticação necessária.", rate.headers);
  }

  const stats = await getDashboardStats();
  return apiJson(stats, rate.headers);
}
