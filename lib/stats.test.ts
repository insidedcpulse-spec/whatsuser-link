import { describe, it, expect, vi, beforeEach } from "vitest";
import { getDashboardStats, recordLinkGenerated, recordApiCall } from "./stats";
import { getRedisClient } from "./redis";

vi.mock("./redis", () => ({
  getRedisClient: vi.fn(),
}));

describe("lib/stats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getRedisClient).mockReturnValue(null);
  });

  it("returns fallback empty stats when redis client is not available", async () => {
    const stats = await getDashboardStats();

    expect(stats.totalLinks).toBe(0);
    expect(stats.webLinks).toBe(0);
    expect(stats.apiLinks).toBe(0);
    expect(stats.totalApiCalls).toBe(0);
    expect(stats.todayLinks).toBe(0);
    expect(stats.todayApiCalls).toBe(0);
    expect(stats.totalUniqueClients).toBe(0);
    expect(stats.todayNewClients).toBe(0);
    expect(stats.todayReturningClients).toBe(0);
    expect(stats.dailyHistory).toHaveLength(7);
    expect(stats.dailyHistory[0]).toHaveProperty("newClients", 0);
    expect(stats.dailyHistory[0]).toHaveProperty("returningClients", 0);
    expect(stats.lastUpdated).toBeTruthy();
  });

  it("does not throw when recording links without redis", async () => {
    await expect(recordLinkGenerated("web", "phone")).resolves.not.toThrow();
    await expect(recordLinkGenerated("api", "username")).resolves.not.toThrow();
  });

  it("does not throw when recording api calls without redis", async () => {
    await expect(recordApiCall("/api/v1/phone-link")).resolves.not.toThrow();
  });

  it("tracks new vs returning clients correctly in recordApiCall", async () => {
    const mockPipeline = {
      incr: vi.fn().mockReturnThis(),
      hincrby: vi.fn().mockReturnThis(),
      hsetnx: vi.fn().mockReturnThis(),
      hset: vi.fn().mockReturnThis(),
      sadd: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue([]),
    };

    const hexistsMock = vi.fn();
    const mockRedis = {
      hexists: hexistsMock,
      pipeline: vi.fn(() => mockPipeline),
    };

    vi.mocked(getRedisClient).mockReturnValue(mockRedis as any);

    const req = new Request("https://whatsusernames.link/api/v1/phone-link", {
      headers: { "x-forwarded-for": "203.0.113.195", "user-agent": "TestAgent/1.0" },
    });

    // Test 1: New client (hexists returns false / 0)
    hexistsMock.mockResolvedValueOnce(0);
    await recordApiCall("/api/v1/phone-link", req);

    expect(hexistsMock).toHaveBeenCalledWith(expect.stringMatching(/^stats:client:/), "first_seen");
    expect(mockPipeline.hsetnx).toHaveBeenCalledWith(expect.stringMatching(/^stats:client:/), "first_seen", expect.any(String));
    expect(mockPipeline.sadd).toHaveBeenCalledWith(expect.stringMatching(/^stats:daily:.*:new_clients$/), expect.any(String));
    expect(mockPipeline.sadd).toHaveBeenCalledWith("stats:clients:all", expect.any(String));
    expect(mockPipeline.sadd).toHaveBeenCalledWith(expect.stringMatching(/^stats:daily:.*:active_clients$/), expect.any(String));

    // Test 2: Returning client (hexists returns true / 1)
    vi.clearAllMocks();
    hexistsMock.mockResolvedValueOnce(1);
    await recordApiCall("/api/v1/phone-link", req);

    expect(mockPipeline.hsetnx).not.toHaveBeenCalled();
    expect(mockPipeline.sadd).not.toHaveBeenCalledWith(expect.stringMatching(/^stats:daily:.*:new_clients$/), expect.any(String));
    expect(mockPipeline.sadd).toHaveBeenCalledWith("stats:clients:all", expect.any(String));
    expect(mockPipeline.sadd).toHaveBeenCalledWith(expect.stringMatching(/^stats:daily:.*:active_clients$/), expect.any(String));
  });

  it("returns totalUniqueClients, todayNewClients, todayReturningClients, and daily client history breakdown from getDashboardStats", async () => {
    const mockResults = [
      100, // totalLinks (0)
      60,  // webLinks (1)
      40,  // apiLinks (2)
      50,  // totalApiCalls (3)
      10,  // todayLinks (4)
      15,  // todayApiCalls (5)
      { "phone-link": 30, "username-link": 20 }, // endpointBreakdown (6)
      25,  // totalUniqueClients (7)
      5,   // todayNewClients (8)
      12,  // todayActiveClients (9) -> todayReturningClients = 12 - 5 = 7
      // Past 7 dates (links, apiCalls, newClients, activeClients)
      ...Array(7).fill([8, 10, 2, 6]).flat(),
    ];

    const mockPipeline = {
      get: vi.fn().mockReturnThis(),
      hgetall: vi.fn().mockReturnThis(),
      scard: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue(mockResults),
    };

    const mockRedis = {
      pipeline: vi.fn(() => mockPipeline),
    };

    vi.mocked(getRedisClient).mockReturnValue(mockRedis as any);

    const stats = await getDashboardStats();

    expect(stats.totalUniqueClients).toBe(25);
    expect(stats.todayNewClients).toBe(5);
    expect(stats.todayReturningClients).toBe(7);
    expect(stats.dailyHistory).toHaveLength(7);
    expect(stats.dailyHistory[0]).toEqual({
      date: expect.any(String),
      links: 8,
      apiCalls: 10,
      newClients: 2,
      returningClients: 4,
    });
  });
});
