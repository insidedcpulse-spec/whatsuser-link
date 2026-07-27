import { Redis } from "@upstash/redis";

let redisInstance: Redis | null | undefined;

export function getRedisClient(): Redis | null {
  if (redisInstance === undefined) {
    const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;

    if (!url || !token) {
      redisInstance = null;
    } else {
      redisInstance = new Redis({ url, token });
    }
  }

  return redisInstance;
}
