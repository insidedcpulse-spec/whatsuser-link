"use client";

import { useEffect } from "react";
import { WEBMCP_TOOLS, getWebMcpManifest } from "@/lib/webmcp";

declare global {
  interface Window {
    __WEBMCP__?: {
      version: string;
      tools: typeof WEBMCP_TOOLS;
      execute: (toolName: string, args: Record<string, unknown>) => Promise<unknown> | unknown;
    };
  }
  interface Navigator {
    modelContext?: {
      registerTool: (tool: {
        name: string;
        description: string;
        parameters: unknown;
        execute: (args: unknown) => Promise<unknown> | unknown;
      }) => void;
      provideContext?: (context: unknown) => void;
    };
  }
}

export function WebMcpProvider() {
  useEffect(() => {
    // 1. Expor bridge global para agentes de browser e extensões
    window.__WEBMCP__ = {
      version: "1.0.0",
      tools: WEBMCP_TOOLS,
      execute: (toolName, args) => {
        const tool = WEBMCP_TOOLS.find((t) => t.name === toolName);
        if (!tool) {
          throw new Error(`WebMCP Tool '${toolName}' not found.`);
        }
        return tool.execute(args);
      }
    };

    // 2. Registar nativamente na API do browser se suportado (Chrome WebML/WebMCP)
    if (typeof navigator !== "undefined" && navigator.modelContext?.registerTool) {
      try {
        for (const tool of WEBMCP_TOOLS) {
          navigator.modelContext.registerTool({
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters,
            execute: (args: unknown) => tool.execute((args as Record<string, unknown>) || {})
          });
        }
      } catch (err) {
        console.debug("[WebMCP] Registration note:", err);
      }
    }
  }, []);

  const manifestJson = JSON.stringify(getWebMcpManifest());

  return (
    <script
      id="webmcp-manifest"
      type="application/webmcp+json"
      dangerouslySetInnerHTML={{ __html: manifestJson }}
    />
  );
}
