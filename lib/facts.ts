import { openApiDocument } from "@/lib/api/openapi";
import { getPostSlugs } from "@/lib/blog";
import { COUNTRY_CODES } from "@/lib/countryCodes";
import { getAllEntities } from "@/lib/entities";
import { getRedisClient } from "@/lib/redis";
import { routing } from "@/i18n/routing";

/** MCP tools exposed at /api/mcp (one file per tool in app/api/mcp/tools). */
export const MCP_TOOLS = [
  "validate_username",
  "validate_phone",
  "username_link",
  "phone_link",
  "qr_code",
] as const;

export const API_RATE_LIMITS = { json: 60, qr: 20 } as const;
export const BULK_FACTS = { maxRows: 500, priceUsd: "4.99", downloads: 5, hours: 48, pngPixels: 400 } as const;

export interface UsageStats {
  links: number;
  apiRequests: number;
  apiClients: number;
}

export interface SiteFacts {
  languages: number;
  articlesPerLanguage: number;
  glossaryTerms: number;
  countries: number;
  apiEndpoints: number;
  mcpTools: number;
  usage: UsageStats | null;
  asOf: string;
}

/** Real counters from Redis; null when unavailable so pages omit the claim instead of guessing. */
export async function getUsageStats(): Promise<UsageStats | null> {
  const redis = getRedisClient();
  if (!redis) return null;
  try {
    const [links, apiRequests, apiClients] = await Promise.all([
      redis.get<number>("stats:links:total"),
      redis.get<number>("stats:api:total"),
      redis.scard("stats:clients:all"),
    ]);
    if (typeof links !== "number" || typeof apiRequests !== "number") return null;
    return { links, apiRequests, apiClients: apiClients ?? 0 };
  } catch {
    return null;
  }
}

export async function getSiteFacts(): Promise<SiteFacts> {
  const paths = Object.keys(openApiDocument.paths).filter((p) => !p.endsWith("openapi.json"));
  return {
    languages: routing.locales.length,
    articlesPerLanguage: getPostSlugs("en").length,
    glossaryTerms: getAllEntities("en").length,
    countries: COUNTRY_CODES.length,
    apiEndpoints: paths.length,
    mcpTools: MCP_TOOLS.length,
    usage: await getUsageStats(),
    asOf: new Date().toISOString().slice(0, 10),
  };
}
