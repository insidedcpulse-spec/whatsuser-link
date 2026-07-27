import { describe, it, expect, vi, beforeEach } from "vitest";
import { getDashboardStats, recordLinkGenerated, recordApiCall } from "./stats";

vi.mock("./redis", () => ({
  getRedisClient: vi.fn(() => null),
}));

describe("lib/stats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns fallback empty stats when redis client is not available", async () => {
    const stats = await getDashboardStats();

    expect(stats.totalLinks).toBe(0);
    expect(stats.webLinks).toBe(0);
    expect(stats.apiLinks).toBe(0);
    expect(stats.totalApiCalls).toBe(0);
    expect(stats.todayLinks).toBe(0);
    expect(stats.todayApiCalls).toBe(0);
    expect(stats.dailyHistory).toHaveLength(7);
    expect(stats.lastUpdated).toBeTruthy();
  });

  it("does not throw when recording links without redis", async () => {
    await expect(recordLinkGenerated("web", "phone")).resolves.not.toThrow();
    await expect(recordLinkGenerated("api", "username")).resolves.not.toThrow();
  });

  it("does not throw when recording api calls without redis", async () => {
    await expect(recordApiCall("/api/v1/phone-link")).resolves.not.toThrow();
  });
});
