import { describe, it, expect, vi } from "vitest";
import { verifyAdminPassword } from "./auth";

describe("lib/auth", () => {
  it("validates correct password", async () => {
    const valid = await verifyAdminPassword("Mamamias00");
    expect(valid).toBe(true);
  });

  it("rejects wrong password", async () => {
    const valid = await verifyAdminPassword("wrongpass");
    expect(valid).toBe(false);
  });
});
