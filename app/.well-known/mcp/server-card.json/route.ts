import { siteConfig } from "@/config/site";

export const dynamic = "force-static";

// MCP Server Card (SEP-1649 draft): describes the /api/mcp Streamable HTTP server.
// Keep serverInfo in sync with createMcpServer() in app/api/mcp/route.ts.
export function GET(): Response {
  const card = {
    serverInfo: { name: "whatsusernames-link", version: "1.0.0" },
    description:
      "Validate WhatsApp usernames and phone numbers and generate wa.me links and QR codes. No API key required.",
    documentationUrl: `${siteConfig.url}/developers`,
    transport: { type: "streamable-http", endpoint: `${siteConfig.url}/api/mcp` },
    capabilities: { tools: {} },
    authentication: { required: false },
  };

  return Response.json(card, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
