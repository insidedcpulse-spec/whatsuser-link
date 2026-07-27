import { describe, it, expect } from "vitest";
import { getClientId, extractClientIp } from "./client-id";

describe("lib/client-id", () => {
  it("generates 64-char hex SHA-256 hash", () => {
    const req = new Request("https://whatsusernames.link/api/v1/phone-link", {
      headers: {
        "cf-connecting-ip": "203.0.113.195",
        "user-agent": "Mozilla/5.0",
      },
    });
    const clientId = getClientId(req);
    expect(clientId).toMatch(/^[a-f0-9]{64}$/);
  });

  it("returns consistent hash for same IP and User-Agent", () => {
    const req1 = new Request("https://whatsusernames.link/api/v1/phone-link", {
      headers: {
        "cf-connecting-ip": "198.51.100.42",
        "user-agent": "TestAgent/1.0",
      },
    });
    const req2 = new Request("https://whatsusernames.link/api/v1/phone-link", {
      headers: {
        "cf-connecting-ip": "198.51.100.42",
        "user-agent": "TestAgent/1.0",
      },
    });
    expect(getClientId(req1)).toBe(getClientId(req2));
  });

  it("returns different hashes for different IP or User-Agent", () => {
    const baseReq = new Request("https://whatsusernames.link/api/v1/phone-link", {
      headers: {
        "cf-connecting-ip": "198.51.100.42",
        "user-agent": "TestAgent/1.0",
      },
    });

    const diffIpReq = new Request("https://whatsusernames.link/api/v1/phone-link", {
      headers: {
        "cf-connecting-ip": "198.51.100.99",
        "user-agent": "TestAgent/1.0",
      },
    });

    const diffUaReq = new Request("https://whatsusernames.link/api/v1/phone-link", {
      headers: {
        "cf-connecting-ip": "198.51.100.42",
        "user-agent": "DifferentAgent/2.0",
      },
    });

    const baseHash = getClientId(baseReq);
    expect(getClientId(diffIpReq)).not.toBe(baseHash);
    expect(getClientId(diffUaReq)).not.toBe(baseHash);
  });

  it("respects priority: CF-Connecting-IP > X-Forwarded-For > X-Real-IP", () => {
    // 1. All three present -> CF-Connecting-IP wins
    const reqAll = new Request("https://whatsusernames.link", {
      headers: {
        "cf-connecting-ip": "1.1.1.1",
        "x-forwarded-for": "2.2.2.2, 3.3.3.3",
        "x-real-ip": "4.4.4.4",
      },
    });
    expect(extractClientIp(reqAll)).toBe("1.1.1.1");

    // 2. XFF and X-Real-IP present -> XFF first IP wins
    const reqXff = new Request("https://whatsusernames.link", {
      headers: {
        "x-forwarded-for": "2.2.2.2, 3.3.3.3",
        "x-real-ip": "4.4.4.4",
      },
    });
    expect(extractClientIp(reqXff)).toBe("2.2.2.2");

    // 3. Only X-Real-IP present -> X-Real-IP wins
    const reqRealIp = new Request("https://whatsusernames.link", {
      headers: {
        "x-real-ip": "4.4.4.4",
      },
    });
    expect(extractClientIp(reqRealIp)).toBe("4.4.4.4");

    // 4. None present -> defaults to 127.0.0.1
    const reqEmpty = new Request("https://whatsusernames.link");
    expect(extractClientIp(reqEmpty)).toBe("127.0.0.1");
  });
});
