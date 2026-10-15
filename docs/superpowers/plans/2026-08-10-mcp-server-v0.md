# MCP Server v0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `POST /api/mcp`, an MCP (Model Context Protocol) Streamable HTTP endpoint exposing 5 tools (`validate_username`, `validate_phone`, `username_link`, `phone_link`, `qr_code`) that wrap the existing REST API v1 business logic, with no new auth — reusing the current IP rate limiter.

**Architecture:** One pure, unit-testable handler function per tool in `app/api/mcp/tools/*.ts` (same validation/service functions the REST routes already call — zero duplicated business logic). `app/api/mcp/route.ts` wires those handlers into an `McpServer`, served over `WebStandardStreamableHTTPServerTransport` in stateless JSON-response mode, with `checkRateLimit` applied once per HTTP POST before any tool executes.

**Tech Stack:** Next.js 15 App Router Route Handler, `@modelcontextprotocol/sdk` 1.29 (promoted from transitive to direct dependency), `zod` (promoted from transitive to direct dependency), existing `lib/api/*`, `services/*`, `utils/validate-*`, `lib/qr/generate-qr`. Vitest for tests.

Reference: spec at `docs/superpowers/specs/2026-08-10-mcp-server-design.md`.

---

### Task 1: Add direct dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add `@modelcontextprotocol/sdk` and `zod` as direct dependencies**

In `package.json`, in the `"dependencies"` object, add `"@modelcontextprotocol/sdk": "^1.29.0"` alphabetically after `"@base-ui/react"` and before `"@upstash/ratelimit"`, and add `"zod": "^3.25.76"` alphabetically after `"tw-animate-css"` (last entry). Resulting `dependencies` block:

```json
  "dependencies": {
    "@base-ui/react": "^1.6.0",
    "@modelcontextprotocol/sdk": "^1.29.0",
    "@upstash/ratelimit": "^2.0.8",
    "@upstash/redis": "^1.38.0",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "gray-matter": "^4.0.3",
    "jspdf": "^4.2.1",
    "lucide-react": "^1.23.0",
    "next": "15.5.20",
    "next-intl": "^4.13.1",
    "next-mdx-remote": "^6.0.0",
    "next-themes": "^0.4.6",
    "qrcode": "^1.5.4",
    "qrcode.react": "^4.2.0",
    "react": "19.1.0",
    "react-dom": "19.1.0",
    "remark-gfm": "^4.0.1",
    "shadcn": "^4.12.0",
    "sonner": "^2.0.7",
    "tailwind-merge": "^3.6.0",
    "tw-animate-css": "^1.4.0",
    "zod": "^3.25.76"
  },
```

- [ ] **Step 2: Install**

Run: `pnpm install`
Expected: exits 0, `pnpm-lock.yaml` updates (both packages already existed transitively at these exact versions, so this should be a metadata-only change — no new versions downloaded).

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: promote @modelcontextprotocol/sdk and zod to direct dependencies"
```

---

### Task 2: Shared tool-result helpers

**Files:**
- Create: `app/api/mcp/tools/tool-result.ts`
- Test: `app/api/mcp/tools/tool-result.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// app/api/mcp/tools/tool-result.test.ts
import { describe, expect, it } from "vitest";
import { errorResult, jsonResult, rateLimitedResult } from "./tool-result";

describe("jsonResult", () => {
  it("wraps data as a single text content block", () => {
    const result = jsonResult({ valid: true });
    expect(result.isError).toBeUndefined();
    expect(result.content).toEqual([{ type: "text", text: JSON.stringify({ valid: true }) }]);
  });
});

describe("errorResult", () => {
  it("marks isError and encodes code/message as JSON text", () => {
    const result = errorResult("missing_username", 'Param "username" is required.');
    expect(result.isError).toBe(true);
    expect(result.content).toEqual([
      {
        type: "text",
        text: JSON.stringify({ code: "missing_username", message: 'Param "username" is required.' }),
      },
    ]);
  });
});

describe("rateLimitedResult", () => {
  it("returns the rate_limited error shape", () => {
    const result = rateLimitedResult();
    expect(result.isError).toBe(true);
    const parsed = JSON.parse((result.content[0] as { text: string }).text);
    expect(parsed).toEqual({ code: "rate_limited", message: "Too many requests, slow down." });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run app/api/mcp/tools/tool-result.test.ts`
Expected: FAIL — `Cannot find module './tool-result'`

- [ ] **Step 3: Write the implementation**

```typescript
// app/api/mcp/tools/tool-result.ts
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

export function jsonResult(data: unknown): CallToolResult {
  return { content: [{ type: "text", text: JSON.stringify(data) }] };
}

export function errorResult(code: string, message: string): CallToolResult {
  return {
    isError: true,
    content: [{ type: "text", text: JSON.stringify({ code, message }) }],
  };
}

export function rateLimitedResult(): CallToolResult {
  return errorResult("rate_limited", "Too many requests, slow down.");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run app/api/mcp/tools/tool-result.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add app/api/mcp/tools/tool-result.ts app/api/mcp/tools/tool-result.test.ts
git commit -m "feat(mcp): add shared tool-result helpers"
```

---

### Task 3: `validate_username` tool handler

**Files:**
- Create: `app/api/mcp/tools/validate-username.ts`
- Test: `app/api/mcp/tools/validate-username.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// app/api/mcp/tools/validate-username.test.ts
import { describe, expect, it } from "vitest";
import { validateUsernameTool } from "./validate-username";

function text(result: ReturnType<typeof validateUsernameTool>) {
  return JSON.parse((result.content[0] as { text: string }).text);
}

describe("validateUsernameTool", () => {
  it("returns valid:true for a valid username", () => {
    const result = validateUsernameTool({ username: "john.smith" });
    expect(result.isError).toBeUndefined();
    expect(text(result)).toEqual({ valid: true, errors: [] });
  });

  it("sanitizes input like the REST route (@ prefix, uppercase)", () => {
    const result = validateUsernameTool({ username: "@John.Smith" });
    expect(text(result).valid).toBe(true);
  });

  it("returns mapped error codes for an invalid username", () => {
    const result = validateUsernameTool({ username: "ab" });
    const body = text(result);
    expect(body.valid).toBe(false);
    expect(body.errors).toContainEqual({
      code: "username_length",
      message: "Username must be 3-35 characters.",
    });
  });

  it("errors with missing_username when username is empty", () => {
    const result = validateUsernameTool({ username: "" });
    expect(result.isError).toBe(true);
    expect(text(result).code).toBe("missing_username");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run app/api/mcp/tools/validate-username.test.ts`
Expected: FAIL — `Cannot find module './validate-username'`

- [ ] **Step 3: Write the implementation**

```typescript
// app/api/mcp/tools/validate-username.ts
import { sanitizeUsernameInput, validateUsername } from "@/utils/validate-username";
import { mapValidationError } from "@/lib/api/error-codes";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { errorResult, jsonResult } from "./tool-result";

export interface ValidateUsernameArgs {
  username: string;
}

export function validateUsernameTool(args: ValidateUsernameArgs): CallToolResult {
  if (!args.username) {
    return errorResult("missing_username", 'Param "username" is required.');
  }

  const validation = validateUsername(sanitizeUsernameInput(args.username));
  return jsonResult({
    valid: validation.valid,
    errors: validation.errors.map(mapValidationError),
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run app/api/mcp/tools/validate-username.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add app/api/mcp/tools/validate-username.ts app/api/mcp/tools/validate-username.test.ts
git commit -m "feat(mcp): add validate_username tool handler"
```

---

### Task 4: `validate_phone` tool handler

**Files:**
- Create: `app/api/mcp/tools/validate-phone.ts`
- Test: `app/api/mcp/tools/validate-phone.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// app/api/mcp/tools/validate-phone.test.ts
import { describe, expect, it } from "vitest";
import { validatePhoneTool } from "./validate-phone";

function text(result: ReturnType<typeof validatePhoneTool>) {
  return JSON.parse((result.content[0] as { text: string }).text);
}

describe("validatePhoneTool", () => {
  it("returns valid:true for a valid phone number", () => {
    const result = validatePhoneTool({ phone: "15550001234" });
    expect(result.isError).toBeUndefined();
    expect(text(result)).toEqual({ valid: true, errors: [] });
  });

  it("sanitizes symbols/spaces and a leading 0 like the REST route", () => {
    const result = validatePhoneTool({ phone: "+1 (555) 000-1234" });
    expect(text(result).valid).toBe(true);
  });

  it("returns a mapped error code for an invalid phone number", () => {
    const result = validatePhoneTool({ phone: "123" });
    const body = text(result);
    expect(body.valid).toBe(false);
    expect(body.errors).toContainEqual({
      code: "phone_invalid_format",
      message: "Phone must be 8-15 digits including country code (digits only, no spaces or symbols).",
    });
  });

  it("errors with missing_phone when phone is empty", () => {
    const result = validatePhoneTool({ phone: "" });
    expect(result.isError).toBe(true);
    expect(text(result).code).toBe("missing_phone");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run app/api/mcp/tools/validate-phone.test.ts`
Expected: FAIL — `Cannot find module './validate-phone'`

- [ ] **Step 3: Write the implementation**

```typescript
// app/api/mcp/tools/validate-phone.ts
import { sanitizePhoneInput, validatePhoneNumber } from "@/utils/validate-phone";
import { mapValidationError } from "@/lib/api/error-codes";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { errorResult, jsonResult } from "./tool-result";

export interface ValidatePhoneArgs {
  phone: string;
}

export function validatePhoneTool(args: ValidatePhoneArgs): CallToolResult {
  if (!args.phone) {
    return errorResult("missing_phone", 'Param "phone" is required.');
  }

  const validation = validatePhoneNumber(sanitizePhoneInput(args.phone));
  return jsonResult({
    valid: validation.valid,
    errors: validation.errors.map(mapValidationError),
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run app/api/mcp/tools/validate-phone.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add app/api/mcp/tools/validate-phone.ts app/api/mcp/tools/validate-phone.test.ts
git commit -m "feat(mcp): add validate_phone tool handler"
```

---

### Task 5: `username_link` tool handler

**Files:**
- Create: `app/api/mcp/tools/username-link.ts`
- Test: `app/api/mcp/tools/username-link.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// app/api/mcp/tools/username-link.test.ts
import { describe, expect, it } from "vitest";
import { usernameLinkTool } from "./username-link";

function text(result: Awaited<ReturnType<typeof usernameLinkTool>>) {
  return JSON.parse((result.content[0] as { text: string }).text);
}

describe("usernameLinkTool", () => {
  it("generates link, shortLink, and notice for a valid username", () => {
    const result = usernameLinkTool({ username: "john.smith" });
    const body = text(result);
    expect(body.username).toBe("john.smith");
    expect(body.link).toBe("https://wa.me/john.smith");
    expect(body.shortLink).toContain("/john.smith");
    expect(body.notice).toContain("wa.me");
    expect(body.key).toBeUndefined();
  });

  it("echoes key and encodes text", () => {
    const result = usernameLinkTool({ username: "john.smith", key: "AB12", text: "hello world" });
    const body = text(result);
    expect(body.key).toBe("AB12");
    expect(body.link).toBe("https://wa.me/john.smith?text=hello%20world");
  });

  it("sanitizes input like the UI does (@ prefix, uppercase)", () => {
    const result = usernameLinkTool({ username: "@John.Smith" });
    expect(text(result).username).toBe("john.smith");
  });

  it("errors with missing_username when username is empty", () => {
    const result = usernameLinkTool({ username: "" });
    expect(result.isError).toBe(true);
    expect(text(result).code).toBe("missing_username");
  });

  it("returns a mapped error code for an invalid username", () => {
    const result = usernameLinkTool({ username: "ab" });
    expect(result.isError).toBe(true);
    expect(text(result).code).toBe("username_length");
  });

  it("returns a mapped error code for an invalid key", () => {
    const result = usernameLinkTool({ username: "john.smith", key: "x" });
    expect(result.isError).toBe(true);
    expect(text(result).code).toBe("key_invalid_format");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run app/api/mcp/tools/username-link.test.ts`
Expected: FAIL — `Cannot find module './username-link'`

- [ ] **Step 3: Write the implementation**

```typescript
// app/api/mcp/tools/username-link.ts
import { createWhatsAppLink } from "@/services/link-service";
import { sanitizeUsernameInput } from "@/utils/validate-username";
import { mapValidationError } from "@/lib/api/error-codes";
import { buildShortLink } from "@/lib/short-link";
import { USERNAME_LINK_NOTICE } from "@/lib/api/responses";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { errorResult, jsonResult } from "./tool-result";

export interface UsernameLinkArgs {
  username: string;
  key?: string;
  text?: string;
}

export function usernameLinkTool(args: UsernameLinkArgs): CallToolResult {
  if (!args.username) {
    return errorResult("missing_username", 'Param "username" is required.');
  }

  const username = sanitizeUsernameInput(args.username);
  const result = createWhatsAppLink(username, args.key, args.text);

  if (!result.success) {
    const { code, message } = mapValidationError(result.errors[0]);
    return errorResult(code, message);
  }

  return jsonResult({
    username: result.link.username,
    ...(result.link.usernameKey ? { key: result.link.usernameKey } : {}),
    link: result.link.url,
    shortLink: buildShortLink(result.link.username),
    notice: USERNAME_LINK_NOTICE,
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run app/api/mcp/tools/username-link.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add app/api/mcp/tools/username-link.ts app/api/mcp/tools/username-link.test.ts
git commit -m "feat(mcp): add username_link tool handler"
```

---

### Task 6: `phone_link` tool handler

**Files:**
- Create: `app/api/mcp/tools/phone-link.ts`
- Test: `app/api/mcp/tools/phone-link.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// app/api/mcp/tools/phone-link.test.ts
import { describe, expect, it } from "vitest";
import { phoneLinkTool } from "./phone-link";

function text(result: ReturnType<typeof phoneLinkTool>) {
  return JSON.parse((result.content[0] as { text: string }).text);
}

describe("phoneLinkTool", () => {
  it("generates a link for a valid phone number", () => {
    const result = phoneLinkTool({ phone: "15550001234" });
    const body = text(result);
    expect(body.phone).toBe("15550001234");
    expect(body.link).toBe("https://wa.me/15550001234");
  });

  it("sanitizes symbols/spaces before generating the link", () => {
    const result = phoneLinkTool({ phone: "+1 (555) 000-1234" });
    expect(text(result).phone).toBe("15550001234");
  });

  it("errors with missing_phone when phone is empty", () => {
    const result = phoneLinkTool({ phone: "" });
    expect(result.isError).toBe(true);
    expect(text(result).code).toBe("missing_phone");
  });

  it("returns a mapped error code for an invalid phone number", () => {
    const result = phoneLinkTool({ phone: "123" });
    expect(result.isError).toBe(true);
    expect(text(result).code).toBe("phone_invalid_format");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run app/api/mcp/tools/phone-link.test.ts`
Expected: FAIL — `Cannot find module './phone-link'`

- [ ] **Step 3: Write the implementation**

```typescript
// app/api/mcp/tools/phone-link.ts
import { createPhoneWhatsAppLink } from "@/services/phone-link-service";
import { sanitizePhoneInput } from "@/utils/validate-phone";
import { mapValidationError } from "@/lib/api/error-codes";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { errorResult, jsonResult } from "./tool-result";

export interface PhoneLinkArgs {
  phone: string;
  text?: string;
}

export function phoneLinkTool(args: PhoneLinkArgs): CallToolResult {
  if (!args.phone) {
    return errorResult("missing_phone", 'Param "phone" is required (full international number).');
  }

  const phone = sanitizePhoneInput(args.phone);
  const result = createPhoneWhatsAppLink(phone, args.text);

  if (!result.success) {
    const { code, message } = mapValidationError(result.errors[0]);
    return errorResult(code, message);
  }

  return jsonResult({ phone: result.link.phone, link: result.link.url });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run app/api/mcp/tools/phone-link.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add app/api/mcp/tools/phone-link.ts app/api/mcp/tools/phone-link.test.ts
git commit -m "feat(mcp): add phone_link tool handler"
```

---

### Task 7: `qr_code` tool handler

**Files:**
- Create: `app/api/mcp/tools/qr-code.ts`
- Test: `app/api/mcp/tools/qr-code.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// app/api/mcp/tools/qr-code.test.ts
import { describe, expect, it } from "vitest";
import { qrCodeTool } from "./qr-code";

function errorBody(result: Awaited<ReturnType<typeof qrCodeTool>>) {
  return JSON.parse((result.content[0] as { text: string }).text);
}

describe("qrCodeTool", () => {
  it("returns a base64 PNG image block for a valid username", async () => {
    const result = await qrCodeTool({ username: "john.smith" });
    expect(result.isError).toBeUndefined();
    const block = result.content[0] as { type: string; data: string; mimeType: string };
    expect(block.type).toBe("image");
    expect(block.mimeType).toBe("image/png");
    expect(block.data.length).toBeGreaterThan(0);
  });

  it("returns a base64 PNG image block for a valid phone number", async () => {
    const result = await qrCodeTool({ phone: "15550001234" });
    const block = result.content[0] as { type: string };
    expect(block.type).toBe("image");
  });

  it("returns SVG markup as text when format is svg", async () => {
    const result = await qrCodeTool({ username: "john.smith", format: "svg" });
    const block = result.content[0] as { type: string; text: string };
    expect(block.type).toBe("text");
    expect(block.text).toContain("<svg");
  });

  it("errors when both username and phone are provided", async () => {
    const result = await qrCodeTool({ username: "john.smith", phone: "15550001234" });
    expect(result.isError).toBe(true);
    expect(errorBody(result).code).toBe("missing_target");
  });

  it("errors when neither username nor phone is provided", async () => {
    const result = await qrCodeTool({});
    expect(result.isError).toBe(true);
    expect(errorBody(result).code).toBe("missing_target");
  });

  it("errors on an out-of-range size", async () => {
    const result = await qrCodeTool({ username: "john.smith", size: 50 });
    expect(result.isError).toBe(true);
    expect(errorBody(result).code).toBe("invalid_size");
  });

  it("errors on an invalid color", async () => {
    const result = await qrCodeTool({ username: "john.smith", color: "zzzzzz" });
    expect(result.isError).toBe(true);
    expect(errorBody(result).code).toBe("invalid_color");
  });

  it("errors on an invalid username before validating QR options", async () => {
    const result = await qrCodeTool({ username: "ab" });
    expect(result.isError).toBe(true);
    expect(errorBody(result).code).toBe("username_length");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run app/api/mcp/tools/qr-code.test.ts`
Expected: FAIL — `Cannot find module './qr-code'`

- [ ] **Step 3: Write the implementation**

```typescript
// app/api/mcp/tools/qr-code.ts
import { createWhatsAppLink } from "@/services/link-service";
import { createPhoneWhatsAppLink } from "@/services/phone-link-service";
import { sanitizeUsernameInput } from "@/utils/validate-username";
import { sanitizePhoneInput } from "@/utils/validate-phone";
import { mapValidationError } from "@/lib/api/error-codes";
import { generateQr } from "@/lib/qr/generate-qr";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { errorResult } from "./tool-result";

const HEX_COLOR_REGEX = /^[0-9a-fA-F]{6}$/;
const MIN_SIZE = 128;
const MAX_SIZE = 1024;

export interface QrCodeArgs {
  username?: string;
  phone?: string;
  text?: string;
  format?: "png" | "svg";
  size?: number;
  color?: string;
  bg?: string;
}

export async function qrCodeTool(args: QrCodeArgs): Promise<CallToolResult> {
  const hasUsername = Boolean(args.username);
  const hasPhone = Boolean(args.phone);

  if (hasUsername === hasPhone) {
    return errorResult("missing_target", 'Provide exactly one of "username" or "phone".');
  }

  let link: string;
  if (args.username) {
    const result = createWhatsAppLink(sanitizeUsernameInput(args.username), undefined, args.text);
    if (!result.success) {
      const { code, message } = mapValidationError(result.errors[0]);
      return errorResult(code, message);
    }
    link = result.link.url;
  } else {
    const result = createPhoneWhatsAppLink(sanitizePhoneInput(args.phone as string), args.text);
    if (!result.success) {
      const { code, message } = mapValidationError(result.errors[0]);
      return errorResult(code, message);
    }
    link = result.link.url;
  }

  const format = args.format ?? "png";
  if (format !== "png" && format !== "svg") {
    return errorResult("invalid_format", 'format must be "png" or "svg".');
  }

  const size = args.size ?? 512;
  if (!Number.isInteger(size) || size < MIN_SIZE || size > MAX_SIZE) {
    return errorResult("invalid_size", `size must be an integer between ${MIN_SIZE} and ${MAX_SIZE}.`);
  }

  const color = args.color ?? "000000";
  if (!HEX_COLOR_REGEX.test(color)) {
    return errorResult("invalid_color", "color must be a 6-digit hex value without #.");
  }

  const bg = args.bg ?? "ffffff";
  if (bg !== "transparent" && !HEX_COLOR_REGEX.test(bg)) {
    return errorResult("invalid_bg", 'bg must be a 6-digit hex value without #, or "transparent".');
  }

  const qr = await generateQr({
    content: link,
    format,
    size,
    color: `#${color}`,
    background: bg === "transparent" ? "#ffffff00" : `#${bg}`,
  });

  if (format === "svg") {
    return { content: [{ type: "text", text: qr.body as string }] };
  }

  const base64 = Buffer.from(qr.body as Uint8Array).toString("base64");
  return { content: [{ type: "image", data: base64, mimeType: "image/png" }] };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run app/api/mcp/tools/qr-code.test.ts`
Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
git add app/api/mcp/tools/qr-code.ts app/api/mcp/tools/qr-code.test.ts
git commit -m "feat(mcp): add qr_code tool handler"
```

---

### Task 8: Wire up the MCP route

**Files:**
- Create: `app/api/mcp/route.ts`
- Test: `app/api/mcp/route.test.ts`

- [ ] **Step 1: Write the failing integration test**

```typescript
// app/api/mcp/route.test.ts
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
        params: { name: "validate_username", arguments: { username: "john.smith" } },
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
        params: { name: "qr_code", arguments: { username: "john.smith" } },
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.result.content[0].type).toBe("image");
    expect(body.result.content[0].mimeType).toBe("image/png");
  });
});

describe("GET/DELETE /api/mcp", () => {
  it("rejects GET with 405", async () => {
    const { GET } = await import("./route");
    const res = GET();
    expect(res.status).toBe(405);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run app/api/mcp/route.test.ts`
Expected: FAIL — `Cannot find module './route'`

- [ ] **Step 3: Write the implementation**

```typescript
// app/api/mcp/route.ts
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
  const parsed = body as JsonRpcBody | undefined;
  if (parsed?.method === "tools/call" && parsed.params?.name === "qr_code") {
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

export const GET = methodNotAllowed;
export const DELETE = methodNotAllowed;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run app/api/mcp/route.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Run the full test suite**

Run: `pnpm test`
Expected: PASS, no regressions in the pre-existing REST route tests.

- [ ] **Step 6: Commit**

```bash
git add app/api/mcp/route.ts app/api/mcp/route.test.ts
git commit -m "feat(mcp): wire up POST /api/mcp with 5 tools and shared rate limiting"
```

---

### Task 9: Discovery — `llms.txt`

**Files:**
- Modify: `app/llms.txt/route.ts`

- [ ] **Step 1: Add an MCP section**

In `app/llms.txt/route.ts`, insert a new `## MCP (Model Context Protocol)` section right after the existing `## Public API (free, no key)` section and before `## Structured data`:

```typescript
// app/llms.txt/route.ts — inside the template literal, after the "## Public API" section
## MCP (Model Context Protocol)
AI agents can connect directly at ${siteConfig.url}/api/mcp (Streamable HTTP transport, no API key). Same IP rate limits as the REST API (60/min for most tools, 20/min for qr_code). Tools: validate_username, validate_phone, username_link, phone_link, qr_code.

```

Full resulting order of sections in the template: `# Name`, intro line, `## What this is`, `## Key fact...`, `## Username Key`, `## Not affiliated`, `## Pages`, `## Public API (free, no key)`, `## MCP (Model Context Protocol)` (new), `## Structured data`.

- [ ] **Step 2: Verify manually**

Run: `pnpm dev` (in one terminal), then in another: `curl -s http://localhost:3000/llms.txt | grep -A2 "## MCP"`
Expected: prints the new MCP section text. Stop the dev server after checking (Ctrl-C).

- [ ] **Step 3: Commit**

```bash
git add app/llms.txt/route.ts
git commit -m "docs(llms.txt): add MCP server section"
```

---

### Task 10: Discovery — README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add a bullet to "What's in here"**

In `README.md`, in the "What's in here" list, insert a new bullet right after the "Public REST API v1" bullet and before the "Business Platform API" bullet:

```markdown
- **MCP server** (`/api/mcp`) — connect an AI agent (Claude, etc.) directly via the Model Context Protocol: validate usernames/phone numbers, generate links, and render QR codes as native tool calls. Free, keyless, same IP rate limits as the REST API. Streamable HTTP transport.
```

- [ ] **Step 2: Add a "Connect via MCP" section**

In `README.md`, insert a new section between the "Getting started" section (ending with the `pnpm build` code block) and the "## Environment variables" section:

```markdown
## Connect via MCP

Point any MCP-compatible client at the hosted endpoint — no install, no API key:

```json
{
  "mcpServers": {
    "whatsusernames": {
      "url": "https://whatsusernames.link/api/mcp"
    }
  }
}
```

Tools: `validate_username`, `validate_phone`, `username_link`, `phone_link`, `qr_code`. Same IP rate limits as the REST API.

```

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs(readme): document the MCP server and connection example"
```

---

### Task 11: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Full test suite**

Run: `pnpm test`
Expected: all tests pass, including the 5 new `app/api/mcp/**/*.test.ts` files.

- [ ] **Step 2: Lint**

Run: `pnpm lint`
Expected: no errors.

- [ ] **Step 3: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Production build**

Run: `pnpm build`
Expected: build succeeds, `app/api/mcp` compiles as a serverless Route Handler (default Node.js runtime — same as the existing `qr` REST route, which already depends on the `qrcode` package).

- [ ] **Step 5: Manual smoke test against the dev server**

Run: `pnpm dev` in one terminal, then in another:

```bash
curl -s -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"username_link","arguments":{"username":"john.smith"}}}' \
  | python3 -m json.tool
```

Expected: HTTP 200, JSON-RPC result whose `result.content[0].text` parses to `{"username":"john.smith","link":"https://wa.me/john.smith","shortLink":"...","notice":"..."}`. Stop the dev server after checking (Ctrl-C).

- [ ] **Step 6: Update the spec status**

In `docs/superpowers/specs/2026-08-10-mcp-server-design.md`, change the `**Status:**` line from `Approved by user (brainstorming session)` to `Implemented`.

```bash
git add docs/superpowers/specs/2026-08-10-mcp-server-design.md
git commit -m "docs: mark MCP server v0 spec as implemented"
```
