import { unzipSync } from "fflate";
import { beforeEach, describe, expect, it, vi } from "vitest";

let impl: (id: string) => Promise<boolean> = async () => false;
const calls: string[] = [];
vi.mock("@/lib/bulk/access", () => ({
  consumeBulkAccess: (id: string) => {
    calls.push(id);
    return impl(id);
  },
}));

import { POST } from "./route";

const post = (body: unknown) =>
  POST(
    new Request("http://x/api/bulk/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    })
  );

describe("POST /api/bulk/generate", () => {
  beforeEach(() => {
    calls.length = 0;
    impl = async () => false;
  });

  it("400 on missing fields, no payment check", async () => {
    expect((await post({})).status).toBe(400);
    expect(calls).toHaveLength(0);
  });

  it("422 when no valid rows, before touching payment", async () => {
    expect((await post({ csv: "!!\n1", sessionId: "cs_live_a" })).status).toBe(422);
    expect(calls).toHaveLength(0);
  });

  it("402 when payment is not valid", async () => {
    impl = async () => false;
    expect((await post({ csv: "351912345678", sessionId: "cs_live_a" })).status).toBe(402);
  });

  it("502 when Stripe verification throws", async () => {
    impl = async () => {
      throw new Error("stripe down");
    };
    expect((await post({ csv: "351912345678", sessionId: "cs_live_a" })).status).toBe(502);
  });

  it("returns a ZIP for 500 rows when paid", async () => {
    impl = async () => true;
    const csv = Array.from({ length: 500 }, (_, i) => `3519${String(10000000 + i)}`).join("\n");
    const res = await post({ csv, sessionId: "cs_live_a" });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/zip");
    const files = unzipSync(new Uint8Array(await res.arrayBuffer()));
    expect(Object.keys(files)).toHaveLength(501); // 500 PNG + links.csv
  }, 60_000);
});
