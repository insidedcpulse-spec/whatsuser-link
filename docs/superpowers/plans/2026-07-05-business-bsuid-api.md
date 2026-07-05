# Business Platform Usernames + BSUID API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new `/api/v1/business/*` section to the existing WhatsUsernames.link public API, covering WhatsApp Business Platform / Cloud API concepts (Business-Scoped User IDs and business usernames) that are distinct from the existing consumer wa.me username feature: validate/parse BSUID, validate business usernames, resolve a unified contact shape, and normalize raw Cloud API webhook payloads.

**Architecture:** Pure, stateless functions in a new `lib/business/` module (mirroring, but independent from, `lib/whatsapp/`), exposed through thin POST route handlers in `app/api/v1/business/*` that reuse the existing response envelope, rate limiter, and OpenAPI spec generator. No database, no real Meta API calls — this phase only validates, parses, and normalizes data the caller provides.

**Tech Stack:** Next.js 15 App Router route handlers, TypeScript strict, Vitest.

**Spec:** `docs/superpowers/specs/2026-07-05-business-bsuid-api-design.md`
**Research:** `docs/research/2026-07-05-bsuid-usernames-research.md`

---

### Task 1: Allow POST in the shared API CORS headers

**Files:**
- Modify: `lib/api/responses.ts:3-7`
- Test: `lib/api/responses.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `lib/api/responses.test.ts`, inside the existing `describe("apiOptions", ...)` block:

```ts
  it("returns 204 with CORS method headers", () => {
    const res = apiOptions();
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Methods")).toContain("GET");
    expect(res.headers.get("Access-Control-Allow-Methods")).toContain("POST");
  });
```

(Replace the existing single-assertion `it` block with this one — same test name, one more assertion.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/api/responses.test.ts`
Expected: FAIL — `Access-Control-Allow-Methods` does not contain "POST" (current value is `"GET, OPTIONS"`).

- [ ] **Step 3: Write minimal implementation**

In `lib/api/responses.ts`, change:

```ts
export const API_CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;
```

to:

```ts
export const API_CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/api/responses.test.ts`
Expected: PASS (all tests in the file, not just the one changed)

- [ ] **Step 5: Commit**

```bash
git add lib/api/responses.ts lib/api/responses.test.ts
git commit -m "feat: allow POST in shared API CORS headers"
```

---

### Task 2: BSUID format validator

**Files:**
- Create: `lib/business/bsuid/validate.ts`
- Test: `lib/business/bsuid/validate.test.ts`

Format confirmed by research (§2): ISO 3166 alpha-2 country code, `.`, then 1-128 alphanumeric characters. Parent variant inserts a literal `ENT.` before the alphanumeric part.

- [ ] **Step 1: Write the failing test**

Create `lib/business/bsuid/validate.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { validateBsuid } from "./validate";

describe("validateBsuid", () => {
  it("accepts a plain BSUID", () => {
    expect(validateBsuid("US.13491208655302741918")).toEqual({ valid: true, isParent: false });
  });

  it("accepts a parent BSUID", () => {
    expect(validateBsuid("US.ENT.11815799212886844830")).toEqual({ valid: true, isParent: true });
  });

  it("rejects a lowercase country code", () => {
    expect(validateBsuid("us.13491208655302741918")).toEqual({ valid: false, isParent: false });
  });

  it("rejects a missing dot", () => {
    expect(validateBsuid("US13491208655302741918")).toEqual({ valid: false, isParent: false });
  });

  it("rejects a non-alphanumeric character in the id part", () => {
    expect(validateBsuid("US.1349-1208655302741918")).toEqual({ valid: false, isParent: false });
  });

  it("rejects an id part longer than 128 characters", () => {
    expect(validateBsuid(`US.${"a".repeat(129)}`)).toEqual({ valid: false, isParent: false });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/business/bsuid/validate.test.ts`
Expected: FAIL with "Cannot find module './validate'"

- [ ] **Step 3: Write minimal implementation**

Create `lib/business/bsuid/validate.ts`:

```ts
export interface BsuidValidationResult {
  valid: boolean;
  isParent: boolean;
}

const BSUID_REGEX = /^[A-Z]{2}\.(ENT\.)?[A-Za-z0-9]{1,128}$/;

export function validateBsuid(bsuid: string): BsuidValidationResult {
  const valid = BSUID_REGEX.test(bsuid);
  return { valid, isParent: valid && bsuid.includes(".ENT.") };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/business/bsuid/validate.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/business/bsuid/validate.ts lib/business/bsuid/validate.test.ts
git commit -m "feat: add BSUID format validator"
```

---

### Task 3: BSUID parser

**Files:**
- Create: `lib/business/bsuid/parse.ts`
- Test: `lib/business/bsuid/parse.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/business/bsuid/parse.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parseBsuid } from "./parse";

describe("parseBsuid", () => {
  it("parses a plain BSUID", () => {
    expect(parseBsuid("US.13491208655302741918")).toEqual({
      countryCode: "US",
      id: "13491208655302741918",
      isParent: false,
    });
  });

  it("parses a parent BSUID", () => {
    expect(parseBsuid("US.ENT.11815799212886844830")).toEqual({
      countryCode: "US",
      id: "11815799212886844830",
      isParent: true,
    });
  });

  it("returns null for an invalid BSUID", () => {
    expect(parseBsuid("not-a-bsuid")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/business/bsuid/parse.test.ts`
Expected: FAIL with "Cannot find module './parse'"

- [ ] **Step 3: Write minimal implementation**

Create `lib/business/bsuid/parse.ts`:

```ts
export interface ParsedBsuid {
  countryCode: string;
  id: string;
  isParent: boolean;
}

const BSUID_PARSE_REGEX = /^([A-Z]{2})\.(ENT\.)?([A-Za-z0-9]{1,128})$/;

export function parseBsuid(bsuid: string): ParsedBsuid | null {
  const match = BSUID_PARSE_REGEX.exec(bsuid);
  if (!match) return null;
  const [, countryCode, entMarker, id] = match;
  return { countryCode, id, isParent: entMarker !== undefined };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/business/bsuid/parse.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/business/bsuid/parse.ts lib/business/bsuid/parse.test.ts
git commit -m "feat: add BSUID parser"
```

---

### Task 4: Business username validator

**Files:**
- Create: `lib/business/username/validate.ts`
- Test: `lib/business/username/validate.test.ts`

Rules confirmed by research (§"Charset username de negócio"): `a-z0-9._`, case-insensitive, 3-35 chars, at least one letter, no leading/trailing dot, no consecutive dots, no leading `www`, no trailing reserved domain suffix. This is a **separate, stricter** rule set from the existing consumer validator in `utils/validate-username.ts` — do not touch that file (per design, the two features stay independent).

- [ ] **Step 1: Write the failing test**

Create `lib/business/username/validate.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { validateBusinessUsername } from "./validate";

describe("validateBusinessUsername", () => {
  it("accepts a valid username regardless of case", () => {
    expect(validateBusinessUsername("myID")).toEqual({ valid: true, reasons: [] });
  });

  it("treats dot and underscore as distinct (not folded)", () => {
    expect(validateBusinessUsername("my.id")).toEqual({ valid: true, reasons: [] });
    expect(validateBusinessUsername("my_id")).toEqual({ valid: true, reasons: [] });
  });

  it("rejects consecutive dots", () => {
    expect(validateBusinessUsername("ab..cd")).toEqual({ valid: false, reasons: ["consecutive_dots"] });
  });

  it("rejects a leading dot", () => {
    expect(validateBusinessUsername(".abcd")).toEqual({ valid: false, reasons: ["leading_or_trailing_dot"] });
  });

  it("rejects a trailing dot", () => {
    expect(validateBusinessUsername("abcd.")).toEqual({ valid: false, reasons: ["leading_or_trailing_dot"] });
  });

  it("rejects a leading www", () => {
    expect(validateBusinessUsername("wwwabc")).toEqual({ valid: false, reasons: ["leading_www"] });
  });

  it("rejects a trailing reserved domain suffix", () => {
    expect(validateBusinessUsername("abc.com")).toEqual({ valid: false, reasons: ["reserved_domain_suffix"] });
  });

  it("rejects non-English characters", () => {
    expect(validateBusinessUsername("josé")).toEqual({ valid: false, reasons: ["invalid_character"] });
  });

  it("rejects fewer than 3 characters", () => {
    expect(validateBusinessUsername("ab")).toEqual({ valid: false, reasons: ["too_short"] });
  });

  it("rejects more than 35 characters", () => {
    expect(validateBusinessUsername("a".repeat(36))).toEqual({ valid: false, reasons: ["too_long"] });
  });

  it("rejects a username with no letter", () => {
    expect(validateBusinessUsername("12345")).toEqual({ valid: false, reasons: ["no_letter"] });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/business/username/validate.test.ts`
Expected: FAIL with "Cannot find module './validate'"

- [ ] **Step 3: Write minimal implementation**

Create `lib/business/username/validate.ts`:

```ts
export type UsernameValidationReason =
  | "too_short"
  | "too_long"
  | "no_letter"
  | "leading_or_trailing_dot"
  | "consecutive_dots"
  | "leading_www"
  | "reserved_domain_suffix"
  | "invalid_character";

export interface UsernameValidationResult {
  valid: boolean;
  reasons: UsernameValidationReason[];
}

const MIN_LENGTH = 3;
const MAX_LENGTH = 35;
const CHARSET_REGEX = /^[a-z0-9._]+$/i;
const HAS_LETTER_REGEX = /[a-zA-Z]/;
const RESERVED_DOMAIN_SUFFIXES = [".com", ".org", ".net", ".int", ".edu", ".gov", ".mil", ".us", ".in", ".html"];

export function validateBusinessUsername(username: string): UsernameValidationResult {
  const reasons: UsernameValidationReason[] = [];

  if (username.length < MIN_LENGTH) {
    reasons.push("too_short");
  } else if (username.length > MAX_LENGTH) {
    reasons.push("too_long");
  }

  if (!CHARSET_REGEX.test(username)) reasons.push("invalid_character");
  if (!HAS_LETTER_REGEX.test(username)) reasons.push("no_letter");
  if (username.startsWith(".") || username.endsWith(".")) reasons.push("leading_or_trailing_dot");
  if (username.includes("..")) reasons.push("consecutive_dots");
  if (username.toLowerCase().startsWith("www")) reasons.push("leading_www");
  if (RESERVED_DOMAIN_SUFFIXES.some((suffix) => username.toLowerCase().endsWith(suffix))) {
    reasons.push("reserved_domain_suffix");
  }

  return { valid: reasons.length === 0, reasons };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/business/username/validate.test.ts`
Expected: PASS (11 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/business/username/validate.ts lib/business/username/validate.test.ts
git commit -m "feat: add business username validator"
```

---

### Task 5: Webhook normalizer types and Meta Cloud API adapter

**Files:**
- Create: `lib/business/webhook/types.ts`
- Create: `lib/business/webhook/adapters/meta-cloud-api.ts`
- Create: `lib/business/webhook/normalize.ts`
- Test: `lib/business/webhook/normalize.test.ts`

Context: a real WhatsApp Cloud API webhook delivery wraps the `contacts`/`messages`/`statuses` block (the part documented in research §4/§7) inside the standard Meta webhook envelope: `{ entry: [{ changes: [{ value: { contacts, messages, statuses } }] }] }`. This envelope shape is Meta's generic webhook wrapper used across all Graph API products, not something specific to BSUID — the test fixtures below wrap the exact research-report payloads in it. The normalizer also accepts a bare `value`-shaped object directly (just `{ contacts, messages, statuses }`) as a fallback, since a caller might forward only the inner value.

- [ ] **Step 1: Write the failing test**

Create `lib/business/webhook/types.ts` first (plain types, no test needed — TypeScript itself enforces these at compile time):

```ts
export type NormalizedEventKind = "message" | "status";

export interface NormalizedEvent {
  kind: NormalizedEventKind;
  bsuid: string | null;
  phone: string | null;
  username: string | null;
  displayName: string | null;
  raw: unknown;
}

export interface NormalizedWebhook {
  provider: "meta_cloud_api";
  events: NormalizedEvent[];
}

export interface WebhookAdapter {
  recognizes(raw: unknown): boolean;
  normalize(raw: unknown): NormalizedEvent[];
}
```

Then create `lib/business/webhook/normalize.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { normalizeWebhook } from "./normalize";

function envelope(value: unknown) {
  return { entry: [{ changes: [{ value }] }] };
}

describe("normalizeWebhook", () => {
  it("normalizes a classic message payload with no username", () => {
    const value = {
      contacts: [{ profile: { name: "User Name" }, wa_id: "16505551234" }],
      messages: [{ from: "16505551234", id: "wamid.1", type: "text" }],
    };

    const result = normalizeWebhook(envelope(value));

    expect(result).toEqual({
      provider: "meta_cloud_api",
      events: [
        {
          kind: "message",
          bsuid: null,
          phone: "16505551234",
          username: null,
          displayName: "User Name",
          raw: value.messages[0],
        },
      ],
    });
  });

  it("normalizes a message payload with username inside the 30-day window", () => {
    const value = {
      contacts: [
        {
          profile: { name: "User Name", username: "username" },
          wa_id: "16505551234",
          user_id: "US.13491208655302741918",
        },
      ],
      messages: [
        { from: "16505551234", from_user_id: "US.13491208655302741918", id: "wamid.2", type: "text" },
      ],
    };

    const result = normalizeWebhook(envelope(value));

    expect(result?.events[0]).toEqual({
      kind: "message",
      bsuid: "US.13491208655302741918",
      phone: "16505551234",
      username: "username",
      displayName: "User Name",
      raw: value.messages[0],
    });
  });

  it("normalizes a message payload with wa_id omitted outside the 30-day window", () => {
    const value = {
      contacts: [{ profile: { name: "User Name", username: "username" }, user_id: "US.13491208655302741918" }],
      messages: [{ from_user_id: "US.13491208655302741918", id: "wamid.3", type: "text" }],
    };

    const result = normalizeWebhook(envelope(value));

    expect(result?.events[0]).toEqual({
      kind: "message",
      bsuid: "US.13491208655302741918",
      phone: null,
      username: "username",
      displayName: "User Name",
      raw: value.messages[0],
    });
  });

  it("normalizes a status event using recipient_id/recipient_user_id", () => {
    const value = {
      contacts: [{ profile: { name: "User Name" }, wa_id: "16505551234", user_id: "US.13491208655302741918" }],
      statuses: [{ recipient_id: "16505551234", recipient_user_id: "US.13491208655302741918", status: "delivered" }],
    };

    const result = normalizeWebhook(envelope(value));

    expect(result?.events[0]).toEqual({
      kind: "status",
      bsuid: "US.13491208655302741918",
      phone: "16505551234",
      username: null,
      displayName: "User Name",
      raw: value.statuses[0],
    });
  });

  it("accepts a bare value-shaped object without the entry/changes envelope", () => {
    const value = {
      contacts: [{ profile: { name: "User Name" }, wa_id: "16505551234" }],
      messages: [{ from: "16505551234", id: "wamid.4", type: "text" }],
    };

    const result = normalizeWebhook(value);

    expect(result?.events).toHaveLength(1);
  });

  it("returns null for an unrecognized payload shape", () => {
    expect(normalizeWebhook({})).toBeNull();
    expect(normalizeWebhook({ foo: "bar" })).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/business/webhook/normalize.test.ts`
Expected: FAIL with "Cannot find module './normalize'"

- [ ] **Step 3: Write minimal implementation**

Create `lib/business/webhook/adapters/meta-cloud-api.ts`:

```ts
import type { NormalizedEvent, WebhookAdapter } from "../types";

interface MetaContact {
  wa_id?: string;
  user_id?: string;
  profile?: { name?: string; username?: string };
}

interface MetaMessage {
  from?: string;
  from_user_id?: string;
}

interface MetaStatus {
  recipient_id?: string;
  recipient_user_id?: string;
}

interface MetaValue {
  contacts?: MetaContact[];
  messages?: MetaMessage[];
  statuses?: MetaStatus[];
}

function extractValues(raw: unknown): MetaValue[] {
  if (!raw || typeof raw !== "object") return [];
  const obj = raw as Record<string, unknown>;

  if (Array.isArray(obj.entry)) {
    return (obj.entry as Record<string, unknown>[]).flatMap((entry) => {
      const changes = Array.isArray(entry.changes) ? (entry.changes as Record<string, unknown>[]) : [];
      return changes.map((change) => (change.value ?? {}) as MetaValue);
    });
  }

  if (Array.isArray(obj.contacts) || Array.isArray(obj.messages) || Array.isArray(obj.statuses)) {
    return [obj as MetaValue];
  }

  return [];
}

function findContact(contacts: MetaContact[], waId?: string, userId?: string): MetaContact | undefined {
  return contacts.find((c) => (waId && c.wa_id === waId) || (userId && c.user_id === userId));
}

export const metaCloudApiAdapter: WebhookAdapter = {
  recognizes(raw) {
    return extractValues(raw).length > 0;
  },

  normalize(raw) {
    const events: NormalizedEvent[] = [];

    for (const value of extractValues(raw)) {
      const contacts = value.contacts ?? [];

      for (const message of value.messages ?? []) {
        const contact = findContact(contacts, message.from, message.from_user_id);
        events.push({
          kind: "message",
          bsuid: message.from_user_id ?? null,
          phone: message.from ?? null,
          username: contact?.profile?.username ?? null,
          displayName: contact?.profile?.name ?? null,
          raw: message,
        });
      }

      for (const status of value.statuses ?? []) {
        const contact = findContact(contacts, status.recipient_id, status.recipient_user_id);
        events.push({
          kind: "status",
          bsuid: status.recipient_user_id ?? null,
          phone: status.recipient_id ?? null,
          username: contact?.profile?.username ?? null,
          displayName: contact?.profile?.name ?? null,
          raw: status,
        });
      }
    }

    return events;
  },
};
```

Create `lib/business/webhook/normalize.ts`:

```ts
import { metaCloudApiAdapter } from "./adapters/meta-cloud-api";
import type { NormalizedWebhook } from "./types";

export function normalizeWebhook(raw: unknown): NormalizedWebhook | null {
  if (!metaCloudApiAdapter.recognizes(raw)) return null;
  return { provider: "meta_cloud_api", events: metaCloudApiAdapter.normalize(raw) };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/business/webhook/normalize.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/business/webhook/types.ts lib/business/webhook/adapters/meta-cloud-api.ts lib/business/webhook/normalize.ts lib/business/webhook/normalize.test.ts
git commit -m "feat: add WhatsApp Cloud API webhook normalizer"
```

---

### Task 6: Contact resolver

**Files:**
- Create: `lib/business/contact/resolve.ts`
- Test: `lib/business/contact/resolve.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/business/contact/resolve.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { resolveContact } from "./resolve";

describe("resolveContact", () => {
  it("resolves a bsuid input", () => {
    expect(resolveContact({ bsuid: "US.13491208655302741918" })).toEqual({
      id: "US.13491208655302741918",
      type: "bsuid",
      username: null,
      phone: null,
      bsuid: "US.13491208655302741918",
      displayName: null,
      phoneKnown: false,
      bsuidKnown: true,
    });
  });

  it("resolves a phone input", () => {
    expect(resolveContact({ phone: "16505551234" })).toEqual({
      id: "16505551234",
      type: "phone",
      username: null,
      phone: "16505551234",
      bsuid: null,
      displayName: null,
      phoneKnown: true,
      bsuidKnown: false,
    });
  });

  it("resolves a username input", () => {
    expect(resolveContact({ username: "joao.silva" })).toEqual({
      id: "joao.silva",
      type: "username",
      username: "joao.silva",
      phone: null,
      bsuid: null,
      displayName: null,
      phoneKnown: false,
      bsuidKnown: false,
    });
  });

  it("returns null when no identifier is given", () => {
    expect(resolveContact({})).toBeNull();
  });

  it("returns null when more than one identifier is given", () => {
    expect(resolveContact({ phone: "16505551234", username: "joao.silva" })).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/business/contact/resolve.test.ts`
Expected: FAIL with "Cannot find module './resolve'"

- [ ] **Step 3: Write minimal implementation**

Create `lib/business/contact/resolve.ts`:

```ts
export type ContactIdentifierType = "bsuid" | "phone" | "username";

export interface ContactInput {
  bsuid?: string;
  phone?: string;
  username?: string;
}

export interface ResolvedContact {
  id: string;
  type: ContactIdentifierType;
  username: string | null;
  phone: string | null;
  bsuid: string | null;
  displayName: null;
  phoneKnown: boolean;
  bsuidKnown: boolean;
}

const IDENTIFIER_KEYS = ["bsuid", "phone", "username"] as const;

export function resolveContact(input: ContactInput): ResolvedContact | null {
  const provided = IDENTIFIER_KEYS.filter((key) => !!input[key]);
  if (provided.length !== 1) return null;

  const type = provided[0];
  const id = input[type] as string;

  return {
    id,
    type,
    username: type === "username" ? id : null,
    phone: type === "phone" ? id : null,
    bsuid: type === "bsuid" ? id : null,
    displayName: null,
    phoneKnown: type === "phone",
    bsuidKnown: type === "bsuid",
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/business/contact/resolve.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/business/contact/resolve.ts lib/business/contact/resolve.test.ts
git commit -m "feat: add unified contact resolver"
```

---

### Task 7: Route — POST /api/v1/business/bsuid/validate

**Files:**
- Create: `app/api/v1/business/bsuid/validate/route.ts`
- Test: `app/api/v1/business/bsuid/validate/route.test.ts`

- [ ] **Step 1: Write the failing test**

Create `app/api/v1/business/bsuid/validate/route.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { POST } from "./route";

function req(body: unknown): Request {
  return new Request("http://localhost/api/v1/business/bsuid/validate", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/v1/business/bsuid/validate", () => {
  it("returns valid=true for a good BSUID", async () => {
    const res = await POST(req({ bsuid: "US.13491208655302741918" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ valid: true, isParent: false });
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  it("returns valid=false for a malformed BSUID", async () => {
    const res = await POST(req({ bsuid: "not-a-bsuid" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ valid: false, isParent: false });
  });

  it("400s when bsuid field is missing", async () => {
    const res = await POST(req({}));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("missing_bsuid");
  });

  it("400s when the body is not valid JSON", async () => {
    const res = await POST(new Request("http://localhost/x", { method: "POST", body: "{not json" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("invalid_json");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/api/v1/business/bsuid/validate/route.test.ts`
Expected: FAIL with "Cannot find module './route'"

- [ ] **Step 3: Write minimal implementation**

Create `app/api/v1/business/bsuid/validate/route.ts`:

```ts
import { validateBsuid } from "@/lib/business/bsuid/validate";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { apiJson, apiError, apiOptions, apiRateLimited } from "@/lib/api/responses";

export async function POST(request: Request): Promise<Response> {
  const rate = await checkRateLimit(request, "json");
  if (!rate.allowed) return apiRateLimited(rate.headers);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(400, "invalid_json", "Request body must be valid JSON.", rate.headers);
  }

  const bsuid = (body as { bsuid?: unknown }).bsuid;
  if (typeof bsuid !== "string" || bsuid === "") {
    return apiError(400, "missing_bsuid", '"bsuid" field is required.', rate.headers);
  }

  return apiJson(validateBsuid(bsuid), rate.headers);
}

export function OPTIONS(): Response {
  return apiOptions();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run app/api/v1/business/bsuid/validate/route.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add app/api/v1/business/bsuid/validate/route.ts app/api/v1/business/bsuid/validate/route.test.ts
git commit -m "feat: add POST /api/v1/business/bsuid/validate endpoint"
```

---

### Task 8: Route — POST /api/v1/business/bsuid/parse

**Files:**
- Create: `app/api/v1/business/bsuid/parse/route.ts`
- Test: `app/api/v1/business/bsuid/parse/route.test.ts`

- [ ] **Step 1: Write the failing test**

Create `app/api/v1/business/bsuid/parse/route.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { POST } from "./route";

function req(body: unknown): Request {
  return new Request("http://localhost/api/v1/business/bsuid/parse", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/v1/business/bsuid/parse", () => {
  it("parses a valid BSUID", async () => {
    const res = await POST(req({ bsuid: "US.ENT.11815799212886844830" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ countryCode: "US", id: "11815799212886844830", isParent: true });
  });

  it("400s with invalid_bsuid for a malformed BSUID", async () => {
    const res = await POST(req({ bsuid: "not-a-bsuid" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("invalid_bsuid");
  });

  it("400s when bsuid field is missing", async () => {
    const res = await POST(req({}));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("missing_bsuid");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/api/v1/business/bsuid/parse/route.test.ts`
Expected: FAIL with "Cannot find module './route'"

- [ ] **Step 3: Write minimal implementation**

Create `app/api/v1/business/bsuid/parse/route.ts`:

```ts
import { parseBsuid } from "@/lib/business/bsuid/parse";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { apiJson, apiError, apiOptions, apiRateLimited } from "@/lib/api/responses";

export async function POST(request: Request): Promise<Response> {
  const rate = await checkRateLimit(request, "json");
  if (!rate.allowed) return apiRateLimited(rate.headers);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(400, "invalid_json", "Request body must be valid JSON.", rate.headers);
  }

  const bsuid = (body as { bsuid?: unknown }).bsuid;
  if (typeof bsuid !== "string" || bsuid === "") {
    return apiError(400, "missing_bsuid", '"bsuid" field is required.', rate.headers);
  }

  const parsed = parseBsuid(bsuid);
  if (!parsed) {
    return apiError(400, "invalid_bsuid", "Malformed BSUID.", rate.headers);
  }

  return apiJson(parsed, rate.headers);
}

export function OPTIONS(): Response {
  return apiOptions();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run app/api/v1/business/bsuid/parse/route.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add app/api/v1/business/bsuid/parse/route.ts app/api/v1/business/bsuid/parse/route.test.ts
git commit -m "feat: add POST /api/v1/business/bsuid/parse endpoint"
```

---

### Task 9: Route — POST /api/v1/business/username/validate

**Files:**
- Create: `app/api/v1/business/username/validate/route.ts`
- Test: `app/api/v1/business/username/validate/route.test.ts`

- [ ] **Step 1: Write the failing test**

Create `app/api/v1/business/username/validate/route.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { POST } from "./route";

function req(body: unknown): Request {
  return new Request("http://localhost/api/v1/business/username/validate", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/v1/business/username/validate", () => {
  it("returns valid=true with empty reasons for a good username", async () => {
    const res = await POST(req({ username: "joao.silva" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ valid: true, reasons: [] });
  });

  it("returns valid=false with reasons for a bad username", async () => {
    const res = await POST(req({ username: "abc.com" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ valid: false, reasons: ["reserved_domain_suffix"] });
  });

  it("400s when username field is missing", async () => {
    const res = await POST(req({}));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("missing_username");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/api/v1/business/username/validate/route.test.ts`
Expected: FAIL with "Cannot find module './route'"

- [ ] **Step 3: Write minimal implementation**

Create `app/api/v1/business/username/validate/route.ts`:

```ts
import { validateBusinessUsername } from "@/lib/business/username/validate";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { apiJson, apiError, apiOptions, apiRateLimited } from "@/lib/api/responses";

export async function POST(request: Request): Promise<Response> {
  const rate = await checkRateLimit(request, "json");
  if (!rate.allowed) return apiRateLimited(rate.headers);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(400, "invalid_json", "Request body must be valid JSON.", rate.headers);
  }

  const username = (body as { username?: unknown }).username;
  if (typeof username !== "string" || username === "") {
    return apiError(400, "missing_username", '"username" field is required.', rate.headers);
  }

  return apiJson(validateBusinessUsername(username), rate.headers);
}

export function OPTIONS(): Response {
  return apiOptions();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run app/api/v1/business/username/validate/route.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add app/api/v1/business/username/validate/route.ts app/api/v1/business/username/validate/route.test.ts
git commit -m "feat: add POST /api/v1/business/username/validate endpoint"
```

---

### Task 10: Route — POST /api/v1/business/contact/resolve

**Files:**
- Create: `app/api/v1/business/contact/resolve/route.ts`
- Test: `app/api/v1/business/contact/resolve/route.test.ts`

- [ ] **Step 1: Write the failing test**

Create `app/api/v1/business/contact/resolve/route.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { POST } from "./route";

function req(body: unknown): Request {
  return new Request("http://localhost/api/v1/business/contact/resolve", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/v1/business/contact/resolve", () => {
  it("resolves a username identifier", async () => {
    const res = await POST(req({ username: "joao.silva" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      id: "joao.silva",
      type: "username",
      username: "joao.silva",
      phone: null,
      bsuid: null,
      displayName: null,
      phoneKnown: false,
      bsuidKnown: false,
    });
  });

  it("400s with missing_identifier when no field is given", async () => {
    const res = await POST(req({}));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("missing_identifier");
  });

  it("400s with missing_identifier when more than one field is given", async () => {
    const res = await POST(req({ phone: "16505551234", username: "joao.silva" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("missing_identifier");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/api/v1/business/contact/resolve/route.test.ts`
Expected: FAIL with "Cannot find module './route'"

- [ ] **Step 3: Write minimal implementation**

Create `app/api/v1/business/contact/resolve/route.ts`:

```ts
import { resolveContact } from "@/lib/business/contact/resolve";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { apiJson, apiError, apiOptions, apiRateLimited } from "@/lib/api/responses";

function stringOrUndefined(value: unknown): string | undefined {
  return typeof value === "string" && value !== "" ? value : undefined;
}

export async function POST(request: Request): Promise<Response> {
  const rate = await checkRateLimit(request, "json");
  if (!rate.allowed) return apiRateLimited(rate.headers);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(400, "invalid_json", "Request body must be valid JSON.", rate.headers);
  }

  const raw = body as { bsuid?: unknown; phone?: unknown; username?: unknown };
  const result = resolveContact({
    bsuid: stringOrUndefined(raw.bsuid),
    phone: stringOrUndefined(raw.phone),
    username: stringOrUndefined(raw.username),
  });

  if (!result) {
    return apiError(400, "missing_identifier", "Provide exactly one of bsuid, phone, or username.", rate.headers);
  }

  return apiJson(result, rate.headers);
}

export function OPTIONS(): Response {
  return apiOptions();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run app/api/v1/business/contact/resolve/route.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add app/api/v1/business/contact/resolve/route.ts app/api/v1/business/contact/resolve/route.test.ts
git commit -m "feat: add POST /api/v1/business/contact/resolve endpoint"
```

---

### Task 11: Route — POST /api/v1/business/webhook/normalize

**Files:**
- Create: `app/api/v1/business/webhook/normalize/route.ts`
- Test: `app/api/v1/business/webhook/normalize/route.test.ts`

- [ ] **Step 1: Write the failing test**

Create `app/api/v1/business/webhook/normalize/route.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { POST } from "./route";

function req(body: unknown): Request {
  return new Request("http://localhost/api/v1/business/webhook/normalize", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/v1/business/webhook/normalize", () => {
  it("normalizes a recognized webhook payload", async () => {
    const payload = {
      entry: [
        {
          changes: [
            {
              value: {
                contacts: [{ profile: { name: "User Name" }, wa_id: "16505551234" }],
                messages: [{ from: "16505551234", id: "wamid.1", type: "text" }],
              },
            },
          ],
        },
      ],
    };

    const res = await POST(req(payload));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.provider).toBe("meta_cloud_api");
    expect(body.events).toHaveLength(1);
    expect(body.events[0].phone).toBe("16505551234");
  });

  it("422s with webhook_unrecognized_shape for an unrecognized payload", async () => {
    const res = await POST(req({ foo: "bar" }));
    expect(res.status).toBe(422);
    expect((await res.json()).error.code).toBe("webhook_unrecognized_shape");
  });

  it("400s with webhook_invalid_json for a non-JSON body", async () => {
    const res = await POST(new Request("http://localhost/x", { method: "POST", body: "{not json" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("webhook_invalid_json");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/api/v1/business/webhook/normalize/route.test.ts`
Expected: FAIL with "Cannot find module './route'"

- [ ] **Step 3: Write minimal implementation**

Create `app/api/v1/business/webhook/normalize/route.ts`:

```ts
import { normalizeWebhook } from "@/lib/business/webhook/normalize";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { apiJson, apiError, apiOptions, apiRateLimited } from "@/lib/api/responses";

export async function POST(request: Request): Promise<Response> {
  const rate = await checkRateLimit(request, "json");
  if (!rate.allowed) return apiRateLimited(rate.headers);

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return apiError(400, "webhook_invalid_json", "Request body must be valid JSON.", rate.headers);
  }

  const result = normalizeWebhook(raw);
  if (!result) {
    return apiError(
      422,
      "webhook_unrecognized_shape",
      "Payload does not match any known WhatsApp Cloud API webhook shape.",
      rate.headers,
    );
  }

  return apiJson(result, rate.headers);
}

export function OPTIONS(): Response {
  return apiOptions();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run app/api/v1/business/webhook/normalize/route.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add app/api/v1/business/webhook/normalize/route.ts app/api/v1/business/webhook/normalize/route.test.ts
git commit -m "feat: add POST /api/v1/business/webhook/normalize endpoint"
```

---

### Task 12: Extend the OpenAPI spec with the new business endpoints

**Files:**
- Modify: `lib/api/openapi.ts`
- Modify: `lib/api/openapi.test.ts`

- [ ] **Step 1: Write the failing test**

Replace the full contents of `lib/api/openapi.test.ts` with:

```ts
import { describe, expect, it } from "vitest";
import { openApiDocument } from "@/lib/api/openapi";

describe("openApiDocument", () => {
  it("declares OpenAPI 3.1 and all twelve v1 paths", () => {
    expect(openApiDocument.openapi).toBe("3.1.0");
    const paths = Object.keys(openApiDocument.paths);
    expect(paths.sort()).toEqual(
      [
        "/api/v1/username-link",
        "/api/v1/phone-link",
        "/api/v1/validate/username",
        "/api/v1/validate/key",
        "/api/v1/validate/phone",
        "/api/v1/qr",
        "/api/v1/openapi.json",
        "/api/v1/business/bsuid/validate",
        "/api/v1/business/bsuid/parse",
        "/api/v1/business/username/validate",
        "/api/v1/business/contact/resolve",
        "/api/v1/business/webhook/normalize",
      ].sort(),
    );
  });

  it("is JSON-serializable", () => {
    expect(() => JSON.stringify(openApiDocument)).not.toThrow();
  });

  it("every path has a get or post operation with at least one 200 response", () => {
    for (const [path, item] of Object.entries(openApiDocument.paths)) {
      const operation = item.get ?? item.post;
      expect(operation, `${path} missing get/post`).toBeDefined();
      expect(operation!.responses["200"], `${path} missing 200`).toBeDefined();
    }
  });

  it("every business POST path declares a JSON request body", () => {
    const businessPaths = [
      "/api/v1/business/bsuid/validate",
      "/api/v1/business/bsuid/parse",
      "/api/v1/business/username/validate",
      "/api/v1/business/contact/resolve",
      "/api/v1/business/webhook/normalize",
    ];
    for (const path of businessPaths) {
      const post = openApiDocument.paths[path].post;
      expect(post, `${path} missing post`).toBeDefined();
      expect(post!.requestBody, `${path} missing requestBody`).toBeDefined();
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/api/openapi.test.ts`
Expected: FAIL — `paths` only has 7 entries, and `item.get` type doesn't allow `item.post`.

- [ ] **Step 3: Write minimal implementation**

In `lib/api/openapi.ts`, replace the `Operation` interface and add a request-body helper. Change:

```ts
interface Operation {
  get: {
    summary: string;
    parameters?: unknown[];
    responses: Record<string, unknown>;
  };
}
```

to:

```ts
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
```

Add this helper next to `queryParam`:

```ts
function jsonBody(schema: object, example?: unknown) {
  return {
    required: true,
    content: {
      "application/json": { schema, ...(example !== undefined ? { example } : {}) },
    },
  };
}
```

Add five new entries to `paths` (right before the `"/api/v1/openapi.json"` entry):

```ts
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
```

Add matching schemas to `components.schemas` (after the existing `PhoneLink` entry):

```ts
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
```

Also update the `paths` type annotation at the top of the file (`paths: Record<string, Operation>` already works unchanged since `Operation` now has optional `get`/`post`).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/api/openapi.test.ts`
Expected: PASS (4 tests)

Then run the full suite to confirm nothing else broke:

Run: `npx vitest run`
Expected: PASS (all test files)

- [ ] **Step 5: Commit**

```bash
git add lib/api/openapi.ts lib/api/openapi.test.ts
git commit -m "feat: document business BSUID/username API in OpenAPI spec"
```

---

## Self-review notes

- **Spec coverage:** all 5 endpoints from the design doc are implemented (Tasks 7-11), plus the underlying `lib/business/*` modules (Tasks 2-6), CORS support for POST (Task 1), and OpenAPI documentation (Task 12). Error codes match the design's table exactly (`invalid_bsuid`, `invalid_username` reasons array instead of a single code — matches the design's `reasons: string[]` shape — `missing_identifier`, `webhook_unrecognized_shape`, `webhook_invalid_json`), plus a few natural companions (`missing_bsuid`, `missing_username`, `invalid_json`) that follow the existing codebase's inline-error-code convention (see `app/api/v1/validate/username/route.ts`'s `missing_username`) rather than centralizing in `lib/api/error-codes.ts` — that file is specifically for mapping *i18n validator keys*, which the business module has none of.
- **Rate limiting:** reuses the existing `"json"` limiter kind rather than adding a new one — same 60 req/min policy, no new Upstash prefix needed, per YAGNI (design's "mesma política" requirement, satisfied without new code).
- **Type consistency:** `ResolvedContact`, `NormalizedEvent`, `NormalizedWebhook`, `BsuidValidationResult`, `UsernameValidationResult` field names are identical between their `lib/business/*` definition (Tasks 2-6) and their usage in routes (Tasks 7-11) and OpenAPI schemas (Task 12) — verified no drift (e.g. `isParent`, `phoneKnown`/`bsuidKnown`, `reasons`, `displayName` spelled the same everywhere).
- **No placeholders:** every step has complete, runnable code — no TBD/TODO.
