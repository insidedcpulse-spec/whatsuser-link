import { getRedisClient } from "@/lib/redis";

export interface DashboardStats {
  totalLinks: number;
  webLinks: number;
  apiLinks: number;
  totalApiCalls: number;
  todayLinks: number;
  todayApiCalls: number;
  endpointBreakdown: Record<string, number>;
  dailyHistory: Array<{
    date: string;
    links: number;
    apiCalls: number;
  }>;
  lastUpdated: string;
}

function getTodayKey(): string {
  return new Date().toISOString().split("T")[0]; // YYYY-MM-DD
}

function getPastDates(days: number): string[] {
  const dates: string[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split("T")[0]);
  }
  return dates;
}

export async function recordLinkGenerated(source: "web" | "api", linkType: string = "general"): Promise<void> {
  try {
    const redis = getRedisClient();
    if (!redis) return;

    const today = getTodayKey();
    const pipeline = redis.pipeline();

    pipeline.incr("stats:links:total");
    pipeline.incr(`stats:links:${source}`);
    pipeline.incr(`stats:daily:${today}:links`);
    pipeline.hincrby("stats:links:by_type", linkType, 1);

    await pipeline.exec();
  } catch (error) {
    console.warn("[stats] failed to record link generated:", error);
  }
}

export async function recordApiCall(endpoint: string): Promise<void> {
  try {
    const redis = getRedisClient();
    if (!redis) return;

    const today = getTodayKey();
    const cleanEndpoint = endpoint.replace(/^\/api\/v1\//, "").replace(/\/$/, "") || "general";

    const pipeline = redis.pipeline();

    pipeline.incr("stats:api:total");
    pipeline.incr(`stats:daily:${today}:api`);
    pipeline.hincrby("stats:api:by_endpoint", cleanEndpoint, 1);

    await pipeline.exec();
  } catch (error) {
    console.warn("[stats] failed to record api call:", error);
  }
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const redis = getRedisClient();
  const today = getTodayKey();
  const pastDates = getPastDates(7);

  if (!redis) {
    // Return empty stats if Redis is unconfigured
    return {
      totalLinks: 0,
      webLinks: 0,
      apiLinks: 0,
      totalApiCalls: 0,
      todayLinks: 0,
      todayApiCalls: 0,
      endpointBreakdown: { "phone-link": 0, "username-link": 0, "qr": 0 },
      dailyHistory: pastDates.map((date) => ({ date, links: 0, apiCalls: 0 })),
      lastUpdated: new Date().toISOString(),
    };
  }

  try {
    const pipeline = redis.pipeline();

    pipeline.get<number>("stats:links:total");
    pipeline.get<number>("stats:links:web");
    pipeline.get<number>("stats:links:api");
    pipeline.get<number>("stats:api:total");
    pipeline.get<number>(`stats:daily:${today}:links`);
    pipeline.get<number>(`stats:daily:${today}:api`);
    pipeline.hgetall<Record<string, number>>("stats:api:by_endpoint");

    // Add daily history queries
    for (const date of pastDates) {
      pipeline.get<number>(`stats:daily:${date}:links`);
      pipeline.get<number>(`stats:daily:${date}:api`);
    }

    const results = await pipeline.exec();

    const totalLinks = Number(results[0] ?? 0);
    const webLinks = Number(results[1] ?? 0);
    const apiLinks = Number(results[2] ?? 0);
    const totalApiCalls = Number(results[3] ?? 0);
    const todayLinks = Number(results[4] ?? 0);
    const todayApiCalls = Number(results[5] ?? 0);
    const endpointBreakdownRaw = (results[6] as Record<string, number>) || {};

    // Standardize endpoint keys
    const endpointBreakdown: Record<string, number> = {};
    for (const [key, val] of Object.entries(endpointBreakdownRaw)) {
      endpointBreakdown[key] = Number(val ?? 0);
    }

    const dailyHistory: DashboardStats["dailyHistory"] = [];
    let historyIdx = 7;
    for (const date of pastDates) {
      const links = Number(results[historyIdx] ?? 0);
      const apiCalls = Number(results[historyIdx + 1] ?? 0);
      dailyHistory.push({ date, links, apiCalls });
      historyIdx += 2;
    }

    return {
      totalLinks,
      webLinks,
      apiLinks,
      totalApiCalls,
      todayLinks,
      todayApiCalls,
      endpointBreakdown,
      dailyHistory,
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    console.error("[stats] failed to fetch dashboard stats:", error);
    return {
      totalLinks: 0,
      webLinks: 0,
      apiLinks: 0,
      totalApiCalls: 0,
      todayLinks: 0,
      todayApiCalls: 0,
      endpointBreakdown: {},
      dailyHistory: pastDates.map((date) => ({ date, links: 0, apiCalls: 0 })),
      lastUpdated: new Date().toISOString(),
    };
  }
}
