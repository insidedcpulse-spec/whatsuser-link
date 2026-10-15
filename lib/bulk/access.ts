import { getRedisClient } from "@/lib/redis";
import { BULK_APP_TAG, getStripe } from "./stripe";

const MAX_DOWNLOADS = 5;
const VALID_FOR_SECONDS = 48 * 3600;
const SESSION_ID = /^cs_(live|test)_[A-Za-z0-9]+$/;

/** True when the Checkout Session is a paid bulk pack that still has downloads left. */
export async function consumeBulkAccess(sessionId: string): Promise<boolean> {
  if (!SESSION_ID.test(sessionId)) return false;

  let session;
  try {
    session = await getStripe().checkout.sessions.retrieve(sessionId);
  } catch (error) {
    if ((error as { code?: string }).code === "resource_missing") return false;
    throw error;
  }
  const fresh = Date.now() / 1000 - session.created < VALID_FOR_SECONDS;
  if (session.payment_status !== "paid" || session.metadata?.app !== BULK_APP_TAG || !fresh) {
    return false;
  }

  const redis = getRedisClient();
  if (!redis) return true;
  const key = `bulk:downloads:${sessionId}`;
  const used = await redis.incr(key);
  if (used === 1) await redis.expire(key, VALID_FOR_SECONDS);
  return used <= MAX_DOWNLOADS;
}
