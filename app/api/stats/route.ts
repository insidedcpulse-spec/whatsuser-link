import { getDashboardStats } from "@/lib/stats";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { apiJson, apiRateLimited } from "@/lib/api/responses";

export async function GET(request: Request): Promise<Response> {
  const rate = await checkRateLimit(request, "json");
  if (!rate.allowed) return apiRateLimited(rate.headers);

  const stats = await getDashboardStats();
  return apiJson(stats, rate.headers);
}
