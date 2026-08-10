import { describe, expect, it } from "vitest";
import { POST } from "./route";

function rpc(body: unknown): Request {
  return new Request("http://localhost/api/mcp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/mcp", () => {
  it("initializes and lists exactly the 5 expected tools", async () => {
    const initRes = await POST(
      rpc({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-06-18",
          capabilities: {},
          clientInfo: { name: "test-client", version: "1.0.0" },
        },
      }),
    );
    expect(initRes.status).toBe(200);

    const listRes = await POST(rpc({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} }));
    expect(listRes.status).toBe(200);
    const listBody = await listRes.json();
    const names = listBody.result.tools.map((t: { name: string }) => t.name).sort();
    expect(names).toEqual([
      "phone_link",
      "qr_code",
      "username_link",
      "validate_phone",
      "validate_username",
    ]);
  });

  it("calls validate_username end-to-end and returns the tool's JSON payload", async () => {
    const res = await POST(
      rpc({
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: { name: "validate_username", arguments: { username: "joao.silva" } },
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    const payload = JSON.parse(body.result.content[0].text);
    expect(payload).toEqual({ valid: true, errors: [] });
  });

  it("calls qr_code end-to-end and returns an image content block", async () => {
    const res = await POST(
      rpc({
        jsonrpc: "2.0",
        id: 4,
        method: "tools/call",
        params: { name: "qr_code", arguments: { username: "joao.silva" } },
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.result.content[0].type).toBe("image");
    expect(body.result.content[0].mimeType).toBe("image/png");
  });
});

describe("POST /api/mcp batch requests", () => {
  it("rejects a JSON array body with 400 instead of dispatching batched tool calls", async () => {
    const res = await POST(
      rpc([
        {
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: { name: "validate_username", arguments: { username: "joao.silva" } },
        },
        {
          jsonrpc: "2.0",
          id: 2,
          method: "tools/call",
          params: { name: "validate_username", arguments: { username: "joao.silva" } },
        },
      ]),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({
      jsonrpc: "2.0",
      error: { code: -32600, message: "Batch requests are not supported." },
      id: null,
    });
  });
});

describe("GET/DELETE /api/mcp", () => {
  it("rejects GET with 405", async () => {
    const { GET } = await import("./route");
    const res = GET();
    expect(res.status).toBe(405);
  });
});
