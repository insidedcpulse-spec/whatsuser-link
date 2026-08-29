/**
 * WebMCP (Web Model Context Protocol) Standard Bridge for WhatsUsernames.link
 * W3C WebML Community Group & Google Chrome Agent-Ready Web Standard.
 */
import { sanitizePhoneInput, validatePhoneNumber } from "@/utils/validate-phone";
import { sanitizeUsernameInput, validateUsername } from "@/utils/validate-username";
import { validateUsernameKey } from "@/utils/validate-username-key";
import { createWhatsAppLink } from "@/services/link-service";
import { createPhoneWhatsAppLink } from "@/services/phone-link-service";
import { buildShortLink } from "@/lib/short-link";

export interface WebMcpToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, { type: string; description: string; enum?: string[] }>;
    required: string[];
  };
  execute: (args: Record<string, unknown>) => Promise<Record<string, unknown>> | Record<string, unknown>;
}

export const WEBMCP_TOOLS: WebMcpToolDefinition[] = [
  {
    name: "create_whatsapp_phone_link",
    description: "Generate an official wa.me direct chat link and short URL for a phone number with optional pre-filled message.",
    parameters: {
      type: "object",
      properties: {
        phone: { type: "string", description: "International phone number with country code (e.g. +351912345678 or 15550001234)" },
        message: { type: "string", description: "Optional pre-filled message text to start the conversation" }
      },
      required: ["phone"]
    },
    execute: (args) => {
      const phone = sanitizePhoneInput(String(args.phone || ""));
      const message = args.message ? String(args.message) : undefined;
      const res = createPhoneWhatsAppLink(phone, message);
      if (!res.success) {
        return { success: false, errors: res.errors };
      }
      return {
        success: true,
        phone,
        url: res.link.url,
        message: res.link.message || "",
        shortLink: buildShortLink(phone)
      };
    }
  },
  {
    name: "create_whatsapp_username_link",
    description: "Generate an official wa.me link for a WhatsApp @username (2026 rollout) with optional Username Key identity verification and message.",
    parameters: {
      type: "object",
      properties: {
        username: { type: "string", description: "WhatsApp @username handle (e.g. techcorp or joao.silva)" },
        key: { type: "string", description: "Optional 4-character Username Key for identity confirmation" },
        message: { type: "string", description: "Optional pre-filled message text" }
      },
      required: ["username"]
    },
    execute: (args) => {
      const username = sanitizeUsernameInput(String(args.username || ""));
      const key = args.key ? String(args.key) : undefined;
      const message = args.message ? String(args.message) : undefined;
      const res = createWhatsAppLink(username, key, message);
      if (!res.success) {
        return { success: false, errors: res.errors };
      }
      return {
        success: true,
        username: res.link.username,
        url: res.link.url,
        key: res.link.usernameKey || null,
        shortLink: buildShortLink(res.link.username)
      };
    }
  },
  {
    name: "validate_whatsapp_username",
    description: "Check if a username matches official WhatsApp syntax requirements (3-35 characters, alphanumeric, dots, underscores).",
    parameters: {
      type: "object",
      properties: {
        username: { type: "string", description: "Username handle to validate" }
      },
      required: ["username"]
    },
    execute: (args) => {
      const username = sanitizeUsernameInput(String(args.username || ""));
      const res = validateUsername(username);
      return {
        valid: res.valid,
        username,
        errors: res.errors
      };
    }
  },
  {
    name: "validate_whatsapp_phone",
    description: "Validate international format and E.164 compliance for a WhatsApp phone number.",
    parameters: {
      type: "object",
      properties: {
        phone: { type: "string", description: "Phone number with country code" }
      },
      required: ["phone"]
    },
    execute: (args) => {
      const phone = sanitizePhoneInput(String(args.phone || ""));
      const res = validatePhoneNumber(phone);
      return {
        valid: res.valid,
        phone,
        errors: res.errors
      };
    }
  },
  {
    name: "validate_username_key",
    description: "Validate a WhatsApp Username Key (4-character alphanumeric identifier).",
    parameters: {
      type: "object",
      properties: {
        key: { type: "string", description: "4-character key" }
      },
      required: ["key"]
    },
    execute: (args) => {
      const key = String(args.key || "");
      const res = validateUsernameKey(key);
      return {
        valid: res.valid,
        key,
        errors: res.errors
      };
    }
  }
];

export function getWebMcpManifest() {
  return {
    name: "WhatsUsernames WebMCP",
    version: "1.0.0",
    description: "Native in-browser tool definitions for WhatsApp link and username generation",
    tools: WEBMCP_TOOLS.map(({ name, description, parameters }) => ({
      name,
      description,
      parameters
    }))
  };
}
