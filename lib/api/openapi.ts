import { siteConfig } from "@/config/site";

interface OperationDetail {
  summary: string;
  parameters?: unknown[];
  requestBody?: {
    required: boolean;
    content: Record<string, { schema: unknown; example?: unknown }>;
  };
  responses: Record<string, unknown>;
}

interface Operation {
  get?: OperationDetail;
  post?: OperationDetail;
}

function queryParam(name: string, required: boolean, description: string, schema: object = { type: "string" }) {
  return { name, in: "query", required, description, schema };
}

function jsonBody(schema: object, example?: unknown) {
  return {
    required: true,
    content: {
      "application/json": { schema, ...(example !== undefined ? { example } : {}) },
    },
  };
}

const errorResponse = {
  description: "Error",
  content: {
    "application/json": {
      schema: { $ref: "#/components/schemas/Error" },
    },
  },
};

const rateLimitResponses = {
  "429": { ...errorResponse, description: "Rate limit exceeded (60/min JSON, 20/min QR, per IP). Includes Retry-After." },
};

export const openApiDocument: { openapi: string; info: object; servers: object[]; paths: Record<string, Operation>; components: object } = {
  openapi: "3.1.0",
  info: {
    title: "WhatsUsernames.link Public API",
    version: "1.0.0",
    description:
      "Free, keyless API for generating WhatsApp links and QR codes from usernames or phone numbers. " +
      "Rate limited per IP: 60 req/min (JSON endpoints), 20 req/min (/qr). All responses include CORS headers. " +
      "Note: wa.me/<username> links are in a phased WhatsApp rollout and may not resolve yet — see /llms.txt for current status.",
  },
  servers: [{ url: siteConfig.url }],
  paths: {
    "/api/v1/username-link": {
      get: {
        summary: "Generate a WhatsApp link and short link from a username",
        parameters: [
          queryParam("username", true, "WhatsApp username (3-35 chars, lowercase letters, digits, dots, underscores)."),
          queryParam("key", false, "Optional WhatsApp Username Key (4-8 letters/numbers)."),
          queryParam("text", false, "Optional prefilled message."),
        ],
        responses: {
          "200": {
            description: "Generated links",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/UsernameLink" },
                example: {
                  username: "joao.silva",
                  key: "AB12",
                  link: "https://wa.me/joao.silva?text=hello",
                  shortLink: `${siteConfig.url}/joao.silva`,
                  notice: "As of 2026-07-04, wa.me/<username> links do not yet open a chat for most accounts...",
                },
              },
            },
          },
          "400": errorResponse,
          ...rateLimitResponses,
        },
      },
    },
    "/api/v1/phone-link": {
      get: {
        summary: "Generate a WhatsApp click-to-chat link from a phone number",
        parameters: [
          queryParam("phone", true, "Full international number including country code. Symbols/spaces are stripped."),
          queryParam("text", false, "Optional prefilled message."),
        ],
        responses: {
          "200": {
            description: "Generated link",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/PhoneLink" },
                example: { phone: "351912345678", link: "https://wa.me/351912345678" },
              },
            },
          },
          "400": errorResponse,
          ...rateLimitResponses,
        },
      },
    },
    "/api/v1/validate/username": {
      get: {
        summary: "Validate a WhatsApp username",
        parameters: [queryParam("username", true, "Username to validate.")],
        responses: {
          "200": {
            description: "Validation verdict (always 200 for a well-formed request)",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Validation" } } },
          },
          "400": errorResponse,
          ...rateLimitResponses,
        },
      },
    },
    "/api/v1/validate/key": {
      get: {
        summary: "Validate a WhatsApp Username Key",
        parameters: [queryParam("key", true, "Key to validate (4-8 letters/numbers).")],
        responses: {
          "200": {
            description: "Validation verdict",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Validation" } } },
          },
          "400": errorResponse,
          ...rateLimitResponses,
        },
      },
    },
    "/api/v1/validate/phone": {
      get: {
        summary: "Validate an international phone number for WhatsApp links",
        parameters: [queryParam("phone", true, "Phone number to validate.")],
        responses: {
          "200": {
            description: "Validation verdict",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Validation" } } },
          },
          "400": errorResponse,
          ...rateLimitResponses,
        },
      },
    },
    "/api/v1/qr": {
      get: {
        summary: "Generate a QR code image for a WhatsApp link",
        parameters: [
          queryParam("username", false, "WhatsApp username. Provide exactly one of username or phone."),
          queryParam("phone", false, "Phone number. Provide exactly one of username or phone."),
          queryParam("text", false, "Optional prefilled message."),
          queryParam("format", false, "png (default) or svg.", { type: "string", enum: ["png", "svg"] }),
          queryParam("size", false, "PNG width in pixels, 128-1024, default 512.", { type: "integer", minimum: 128, maximum: 1024 }),
          queryParam("color", false, "Foreground hex without #, default 000000."),
          queryParam("bg", false, 'Background hex without #, or "transparent". Default ffffff.'),
        ],
        responses: {
          "200": {
            description: "QR image",
            content: { "image/png": { schema: { type: "string", format: "binary" } }, "image/svg+xml": { schema: { type: "string" } } },
          },
          "400": errorResponse,
          ...rateLimitResponses,
        },
      },
    },
    "/api/v1/business/bsuid/validate": {
      post: {
        summary: "Validate a WhatsApp Business-Scoped User ID (BSUID) format",
        requestBody: jsonBody(
          { $ref: "#/components/schemas/BsuidValidateInput" },
          { bsuid: "US.13491208655302741918" },
        ),
        responses: {
          "200": {
            description: "Validation verdict",
            content: { "application/json": { schema: { $ref: "#/components/schemas/BsuidValidation" } } },
          },
          "400": errorResponse,
          ...rateLimitResponses,
        },
      },
    },
    "/api/v1/business/bsuid/parse": {
      post: {
        summary: "Parse a BSUID into its country code, id, and parent-account flag",
        requestBody: jsonBody(
          { $ref: "#/components/schemas/BsuidValidateInput" },
          { bsuid: "US.ENT.11815799212886844830" },
        ),
        responses: {
          "200": {
            description: "Parsed BSUID",
            content: { "application/json": { schema: { $ref: "#/components/schemas/BsuidParse" } } },
          },
          "400": errorResponse,
          ...rateLimitResponses,
        },
      },
    },
    "/api/v1/business/username/validate": {
      post: {
        summary: "Validate a WhatsApp Business Platform username",
        requestBody: jsonBody(
          { $ref: "#/components/schemas/UsernameValidateInput" },
          { username: "joao.silva" },
        ),
        responses: {
          "200": {
            description: "Validation verdict",
            content: { "application/json": { schema: { $ref: "#/components/schemas/BusinessUsernameValidation" } } },
          },
          "400": errorResponse,
          ...rateLimitResponses,
        },
      },
    },
    "/api/v1/business/contact/resolve": {
      post: {
        summary: "Resolve a contact from exactly one of bsuid, phone, or username",
        requestBody: jsonBody(
          { $ref: "#/components/schemas/ContactResolveInput" },
          { username: "joao.silva" },
        ),
        responses: {
          "200": {
            description: "Unified contact shape",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ResolvedContact" } } },
          },
          "400": errorResponse,
          ...rateLimitResponses,
        },
      },
    },
    "/api/v1/business/webhook/normalize": {
      post: {
        summary: "Normalize a raw WhatsApp Cloud API webhook payload",
        requestBody: jsonBody({ type: "object" }),
        responses: {
          "200": {
            description: "Normalized webhook events",
            content: { "application/json": { schema: { $ref: "#/components/schemas/NormalizedWebhook" } } },
          },
          "400": errorResponse,
          "422": errorResponse,
          ...rateLimitResponses,
        },
      },
    },
    "/api/v1/openapi.json": {
      get: {
        summary: "This document",
        responses: { "200": { description: "OpenAPI 3.1 document", content: { "application/json": {} } } },
      },
    },
  },
  components: {
    schemas: {
      Error: {
        type: "object",
        properties: {
          error: {
            type: "object",
            properties: { code: { type: "string" }, message: { type: "string" } },
            required: ["code", "message"],
          },
        },
        required: ["error"],
      },
      Validation: {
        type: "object",
        properties: {
          valid: { type: "boolean" },
          errors: {
            type: "array",
            items: {
              type: "object",
              properties: { code: { type: "string" }, message: { type: "string" } },
            },
          },
        },
        required: ["valid", "errors"],
      },
      UsernameLink: {
        type: "object",
        properties: {
          username: { type: "string" },
          key: { type: "string" },
          link: { type: "string" },
          shortLink: { type: "string" },
          notice: { type: "string" },
        },
        required: ["username", "link", "shortLink", "notice"],
      },
      PhoneLink: {
        type: "object",
        properties: { phone: { type: "string" }, link: { type: "string" } },
        required: ["phone", "link"],
      },
      BsuidValidateInput: {
        type: "object",
        properties: { bsuid: { type: "string" } },
        required: ["bsuid"],
      },
      BsuidValidation: {
        type: "object",
        properties: { valid: { type: "boolean" }, isParent: { type: "boolean" } },
        required: ["valid", "isParent"],
      },
      BsuidParse: {
        type: "object",
        properties: {
          countryCode: { type: "string" },
          id: { type: "string" },
          isParent: { type: "boolean" },
        },
        required: ["countryCode", "id", "isParent"],
      },
      UsernameValidateInput: {
        type: "object",
        properties: { username: { type: "string" } },
        required: ["username"],
      },
      BusinessUsernameValidation: {
        type: "object",
        properties: {
          valid: { type: "boolean" },
          reasons: { type: "array", items: { type: "string" } },
        },
        required: ["valid", "reasons"],
      },
      ContactResolveInput: {
        type: "object",
        properties: {
          bsuid: { type: "string" },
          phone: { type: "string" },
          username: { type: "string" },
        },
        description: "Provide exactly one of bsuid, phone, or username.",
      },
      ResolvedContact: {
        type: "object",
        properties: {
          id: { type: "string" },
          type: { type: "string", enum: ["bsuid", "phone", "username"] },
          username: { type: ["string", "null"] },
          phone: { type: ["string", "null"] },
          bsuid: { type: ["string", "null"] },
          displayName: { type: "null" },
          phoneKnown: { type: "boolean" },
          bsuidKnown: { type: "boolean" },
        },
        required: ["id", "type", "username", "phone", "bsuid", "displayName", "phoneKnown", "bsuidKnown"],
      },
      NormalizedWebhook: {
        type: "object",
        properties: {
          provider: { type: "string", enum: ["meta_cloud_api"] },
          events: {
            type: "array",
            items: {
              type: "object",
              properties: {
                kind: { type: "string", enum: ["message", "status"] },
                bsuid: { type: ["string", "null"] },
                phone: { type: ["string", "null"] },
                username: { type: ["string", "null"] },
                displayName: { type: ["string", "null"] },
                raw: {},
              },
            },
          },
        },
        required: ["provider", "events"],
      },
    },
  },
};
