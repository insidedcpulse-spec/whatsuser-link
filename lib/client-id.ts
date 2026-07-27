import { createHash } from "crypto";

export function extractClientIp(request: Request): string {
  const cfIp = request.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp.trim();

  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const firstIp = xff.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }

  const xRealIp = request.headers.get("x-real-ip");
  if (xRealIp) return xRealIp.trim();

  return "127.0.0.1";
}

export function getClientId(request: Request): string {
  const ip = extractClientIp(request);
  const userAgent = request.headers.get("user-agent") || "unknown-agent";
  const salt = process.env.CLIENT_ID_SALT || "whatsusernames-default-secret-salt-2026";

  return createHash("sha256")
    .update(`${ip}:${userAgent}:${salt}`)
    .digest("hex");
}
