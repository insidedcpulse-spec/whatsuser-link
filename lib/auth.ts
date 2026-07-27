import { cookies } from "next/headers";
import { createHash } from "crypto";

const DEFAULT_ADMIN_PASSWORD = "Mamamias00";
const COOKIE_NAME = "admin_session";

function getExpectedToken(): string {
  const secret = process.env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD;
  return createHash("sha256").update(`whatsuser-admin-salt:${secret}`).digest("hex");
}

export async function isAuthenticated(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return false;
    return token === getExpectedToken();
  } catch {
    return false;
  }
}

export async function verifyAdminPassword(password: string): Promise<boolean> {
  const expectedPassword = process.env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD;
  return password === expectedPassword;
}

export async function setAdminSession(): Promise<string> {
  const token = getExpectedToken();
  const cookieStore = await cookies();
  cookieStore.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return token;
}

export async function clearAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
