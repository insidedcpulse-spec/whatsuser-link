import { siteConfig } from "@/config/site";

export const API_CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

/** All 200s are deterministic functions of their query params — let the CDN keep them. */
export const API_SUCCESS_CACHE_CONTROL =
  "public, s-maxage=86400, stale-while-revalidate=604800";

/**
 * Status of wa.me username links, surfaced in API responses so integrators
 * aren't surprised. MUST be updated in the same pass as app/llms.txt/route.ts
 * when the rollout status changes — grep "2026-07" to find both.
 */
export const USERNAME_LINK_NOTICE =
  "As of 2026-07-04, wa.me/<username> links do not yet open a chat for most " +
  "accounts (WhatsApp's username rollout is phased and regional). Verify before " +
  `relying on them. Current status: ${siteConfig.url}/llms.txt`;

export function apiJson(data: unknown, extraHeaders: Record<string, string> = {}): Response {
  return Response.json(data, {
    headers: {
      ...API_CORS_HEADERS,
      "Cache-Control": API_SUCCESS_CACHE_CONTROL,
      ...extraHeaders,
    },
  });
}

export function apiError(
  status: number,
  code: string,
  message: string,
  extraHeaders: Record<string, string> = {},
): Response {
  return Response.json(
    { error: { code, message } },
    {
      status,
      headers: { ...API_CORS_HEADERS, "Cache-Control": "no-store", ...extraHeaders },
    },
  );
}

export function apiRateLimited(extraHeaders: Record<string, string> = {}): Response {
  return apiError(429, "rate_limited", "Too many requests, slow down.", extraHeaders);
}

export function apiOptions(): Response {
  return new Response(null, { status: 204, headers: API_CORS_HEADERS });
}
