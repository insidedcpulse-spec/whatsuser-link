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
