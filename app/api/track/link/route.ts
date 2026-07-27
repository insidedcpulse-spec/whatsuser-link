import { recordLinkGenerated } from "@/lib/stats";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { apiJson, apiRateLimited } from "@/lib/api/responses";

export async function POST(request: Request): Promise<Response> {
  const rate = await checkRateLimit(request, "json");
  if (!rate.allowed) return apiRateLimited(rate.headers);

  try {
    const body = await request.json().catch(() => ({}));
    const linkType = typeof body?.type === "string" ? body.type : "general";

    // Record web generated link in background without awaiting to keep UI sub-millisecond fast
    recordLinkGenerated("web", linkType);

    return apiJson({ success: true }, rate.headers);
  } catch {
    return apiJson({ success: true }, rate.headers);
  }
}
