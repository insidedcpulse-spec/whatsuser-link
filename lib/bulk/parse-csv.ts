import { createWhatsAppLink } from "@/services/link-service";
import { createPhoneWhatsAppLink } from "@/services/phone-link-service";
import { sanitizePhoneInput } from "@/utils/validate-phone";
import { sanitizeUsernameInput } from "@/utils/validate-username";

export const MAX_ROWS = 500;

export interface BulkRow {
  index: number;
  input: string;
  kind: "phone" | "username";
  ok: boolean;
  url?: string;
  message?: string;
}

const HEADER = /^(phone|telefone|numero|número|number|username|user|utilizador|usuario)$/i;

/** Minimal RFC4180-ish line splitter: commas/semicolons, double-quoted fields. */
function splitLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') quoted = false;
      else cur += c;
    } else if (c === '"') quoted = true;
    else if (c === "," || c === ";") { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

export function parseBulkCsv(text: string): BulkRow[] {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim());
  if (lines.length && HEADER.test(splitLine(lines[0])[0])) lines.shift();

  return lines.slice(0, MAX_ROWS).map((line, index) => {
    const [rawValue = "", rawMessage = ""] = splitLine(line);
    const message = rawMessage || undefined;
    const looksLikePhone = /^[+\d][\d\s().-]*$/.test(rawValue);

    if (looksLikePhone) {
      const phone = sanitizePhoneInput(rawValue);
      const result = createPhoneWhatsAppLink(phone, message);
      return { index, input: rawValue, kind: "phone" as const, ok: result.success, url: result.success ? result.link.url : undefined, message };
    }
    const username = sanitizeUsernameInput(rawValue);
    const result = createWhatsAppLink(username, undefined, message);
    return { index, input: rawValue, kind: "username" as const, ok: result.success, url: result.success ? result.link.url : undefined, message };
  });
}
