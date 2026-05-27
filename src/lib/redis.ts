import { Redis } from "ioredis"

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined
}

export const redis =
  globalForRedis.redis ??
  new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
    maxRetriesPerRequest: null,
    retryStrategy(times) {
      // Reconnect after
      const delay = Math.min(times * 50, 2000)
      return delay
    },
  })

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis
}
