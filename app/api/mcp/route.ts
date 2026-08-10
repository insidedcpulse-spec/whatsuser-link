import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import { checkRateLimit } from "@/lib/api/rate-limit";
import type { LimiterKind, RateLimitResult } from "@/lib/api/rate-limit";
import { validateUsernameTool } from "./tools/validate-username";
import { validatePhoneTool } from "./tools/validate-phone";
import { usernameLinkTool } from "./tools/username-link";
import { phoneLinkTool } from "./tools/phone-link";
import { qrCodeTool } from "./tools/qr-code";
import { errorResult, rateLimitedResult } from "./tools/tool-result";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

interface JsonRpcBody {
  method?: string;
  params?: { name?: string };
}

function rateLimitKindFor(body: unknown): LimiterKind {
  if (body === null || typeof body !== "object") return "json";
  const parsed = body as JsonRpcBody;
  if (parsed.method === "tools/call" && parsed.params?.name === "qr_code") {
    return "qr";
  }
  return "json";
}

async function runTool(
  name: string,
  run: () => CallToolResult | Promise<CallToolResult>,
): Promise<CallToolResult> {
  try {
    return await run();
  } catch (error) {
    console.error(`[mcp] ${name} failed:`, error);
    return errorResult("internal_error", "Unexpected error.");
  }
}

function createMcpServer(rate: RateLimitResult): McpServer {
  const server = new McpServer({ name: "whatsusernames-link", version: "1.0.0" });

  server.registerTool(
    "validate_username",
    {
      description: "Validate a WhatsApp username (@username) format.",
      inputSchema: {
        username: z.string().describe("The username to validate, with or without @ prefix."),
      },
    },
    async ({ username }) => {
      if (!rate.allowed) return rateLimitedResult();
      return runTool("validate_username", () => validateUsernameTool({ username }));
    },
  );

  server.registerTool(
    "validate_phone",
    {
      description: "Validate a WhatsApp phone number format (8-15 digits, international format).",
      inputSchema: {
        phone: z.string().describe("The phone number to validate, digits only or with symbols/spaces."),
      },
    },
    async ({ phone }) => {
      if (!rate.allowed) return rateLimitedResult();
      return runTool("validate_phone", () => validatePhoneTool({ phone }));
    },
  );

  server.registerTool(
    "username_link",
    {
      description: "Generate a wa.me link (and short link) from a WhatsApp username.",
      inputSchema: {
        username: z.string().describe("The WhatsApp username."),
        key: z.string().optional().describe("Optional WhatsApp Username Key to disambiguate."),
        text: z.string().optional().describe("Optional pre-filled message text."),
      },
    },
    async ({ username, key, text }) => {
      if (!rate.allowed) return rateLimitedResult();
      return runTool("username_link", () => usernameLinkTool({ username, key, text }));
    },
  );

  server.registerTool(
    "phone_link",
    {
      description: "Generate a wa.me link from a phone number.",
      inputSchema: {
        phone: z.string().describe("Full international phone number, digits only or with symbols/spaces."),
        text: z.string().optional().describe("Optional pre-filled message text."),
      },
    },
    async ({ phone, text }) => {
      if (!rate.allowed) return rateLimitedResult();
      return runTool("phone_link", () => phoneLinkTool({ phone, text }));
    },
  );

  server.registerTool(
    "qr_code",
    {
      description: "Render a QR code (PNG or SVG) for a wa.me link built from a username or phone number.",
      inputSchema: {
        username: z.string().optional().describe("WhatsApp username (provide exactly one of username/phone)."),
        phone: z.string().optional().describe("Phone number (provide exactly one of username/phone)."),
        text: z.string().optional().describe("Optional pre-filled message text."),
        format: z.enum(["png", "svg"]).optional().describe("Image format, default png."),
        size: z.number().optional().describe("PNG pixel size, 128-1024, default 512."),
        color: z.string().optional().describe("Foreground hex color without #, default 000000."),
        bg: z.string().optional().describe('Background hex color without #, or "transparent", default ffffff.'),
      },
    },
    async (args) => {
      if (!rate.allowed) return rateLimitedResult();
      return runTool("qr_code", () => qrCodeTool(args));
    },
  );

  return server;
}

export async function POST(request: Request): Promise<Response> {
  const body = await request.json().catch(() => undefined);
  if (Array.isArray(body)) {
    return batchNotSupported();
  }
  const rate = await checkRateLimit(request, rateLimitKindFor(body));

  const server = createMcpServer(rate);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);

  try {
    return await transport.handleRequest(request, { parsedBody: body });
  } finally {
    await transport.close();
    await server.close();
  }
}

function methodNotAllowed(): Response {
  return Response.json(
    { jsonrpc: "2.0", error: { code: -32000, message: "Method not allowed." }, id: null },
    { status: 405 },
  );
}

function batchNotSupported(): Response {
  return Response.json(
    { jsonrpc: "2.0", error: { code: -32600, message: "Batch requests are not supported." }, id: null },
    { status: 400 },
  );
}

export const GET = methodNotAllowed;
export const DELETE = methodNotAllowed;
