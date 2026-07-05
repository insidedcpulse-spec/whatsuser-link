import { openApiDocument } from "@/lib/api/openapi";
import { API_CORS_HEADERS, API_SUCCESS_CACHE_CONTROL } from "@/lib/api/responses";

export const dynamic = "force-static";

export function GET(): Response {
  return Response.json(openApiDocument, {
    headers: { ...API_CORS_HEADERS, "Cache-Control": API_SUCCESS_CACHE_CONTROL },
  });
}
