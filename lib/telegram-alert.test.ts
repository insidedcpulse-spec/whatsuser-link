import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { sendTelegramBurstAlert, checkAndTriggerBurstAlert } from "./telegram-alert";

describe("lib/telegram-alert", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("sendTelegramBurstAlert", () => {
    it("returns false if telegram credentials are not configured", async () => {
      delete process.env.TELEGRAM_ALERT_BOT_TOKEN;
      delete process.env.TELEGRAM_BOT_TOKEN;
      delete process.env.TELEGRAM_ALERT_CHAT_ID;
      delete process.env.TELEGRAM_CHAT_ID;
      delete process.env.ALLOWED_USER_ID;

      const result = await sendTelegramBurstAlert({
        clientId: "abcdef1234567890abcdef",
        endpoint: "business/contact/resolve",
        hourlyRequests: 250,
        threshold: 200,
      });

      expect(result).toBe(false);
    });

    it("sends telegram message when credentials are provided", async () => {
      process.env.TELEGRAM_BOT_TOKEN = "123456:ABC-DEF";
      process.env.TELEGRAM_CHAT_ID = "987654321";

      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true }),
      } as Response);

      const result = await sendTelegramBurstAlert({
        clientId: "26495c4940bb9f8ea1e17bf93f97ba9f2ad13cc357744c7d8ca22dbe57692d83",
        endpoint: "business/contact/resolve",
        hourlyRequests: 250,
        threshold: 200,
        timestamp: "2026-08-26 11:30:00 UTC",
      });

      expect(result).toBe(true);
      expect(fetchSpy).toHaveBeenCalledWith(
        "https://api.telegram.org/bot123456:ABC-DEF/sendMessage",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: expect.stringContaining("26495c49...2d83"),
        })
      );
    });

    it("handles fetch failure gracefully without throwing", async () => {
      process.env.TELEGRAM_BOT_TOKEN = "123456:ABC-DEF";
      process.env.TELEGRAM_CHAT_ID = "987654321";

      vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("Network offline"));

      const result = await sendTelegramBurstAlert({
        clientId: "testclient123",
        endpoint: "phone-link",
        hourlyRequests: 300,
        threshold: 200,
      });

      expect(result).toBe(false);
    });
  });

  describe("checkAndTriggerBurstAlert", () => {
    it("does not trigger alert when below threshold", async () => {
      process.env.API_HOURLY_ALERT_THRESHOLD = "100";
      const mockRedis = {
        incr: vi.fn().mockResolvedValue(50),
        expire: vi.fn().mockResolvedValue(1),
        set: vi.fn().mockResolvedValue(null),
      };

      const triggered = await checkAndTriggerBurstAlert(
        mockRedis,
        "client123",
        "business/contact/resolve"
      );

      expect(triggered).toBe(false);
      expect(mockRedis.incr).toHaveBeenCalledWith(expect.stringMatching(/^stats:client:client123:hour:/));
      expect(mockRedis.set).not.toHaveBeenCalled();
    });

    it("sets expire on first hourly request", async () => {
      process.env.API_HOURLY_ALERT_THRESHOLD = "100";
      const mockRedis = {
        incr: vi.fn().mockResolvedValue(1),
        expire: vi.fn().mockResolvedValue(1),
        set: vi.fn().mockResolvedValue(null),
      };

      await checkAndTriggerBurstAlert(
        mockRedis,
        "client123",
        "business/contact/resolve"
      );

      expect(mockRedis.expire).toHaveBeenCalledWith(expect.stringMatching(/^stats:client:client123:hour:/), 7200);
    });

    it("triggers alert and acquires 1-hour cooldown lock when threshold is reached", async () => {
      process.env.API_HOURLY_ALERT_THRESHOLD = "200";
      process.env.TELEGRAM_BOT_TOKEN = "test-token";
      process.env.TELEGRAM_CHAT_ID = "test-chat";

      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
      } as Response);

      const mockRedis = {
        incr: vi.fn().mockResolvedValue(200),
        expire: vi.fn().mockResolvedValue(1),
        set: vi.fn().mockResolvedValue("OK"),
      };

      const triggered = await checkAndTriggerBurstAlert(
        mockRedis,
        "client123",
        "business/contact/resolve"
      );

      expect(triggered).toBe(true);
      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.stringMatching(/^stats:alert:sent:client123:/),
        "1",
        { nx: true, ex: 3600 }
      );
    });

    it("does not re-trigger alert if cooldown lock is already claimed (set returns null)", async () => {
      process.env.API_HOURLY_ALERT_THRESHOLD = "200";
      const mockRedis = {
        incr: vi.fn().mockResolvedValue(205),
        expire: vi.fn().mockResolvedValue(1),
        set: vi.fn().mockResolvedValue(null), // lock already exists
      };

      const triggered = await checkAndTriggerBurstAlert(
        mockRedis,
        "client123",
        "business/contact/resolve"
      );

      expect(triggered).toBe(false);
    });
  });
});
