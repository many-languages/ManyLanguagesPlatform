import type { ExtractionBundle } from "../variables/types"
import { redis } from "@/src/lib/redis"

const TTL_SECONDS = 15 * 60

export type ExtractionCacheKeyParts = {
  studyId: number
  pilotDatasetHash: string
  extractorVersion: string
  requiredKeysHash: string
}

export function buildExtractionCacheKey(parts: ExtractionCacheKeyParts): string {
  return `${parts.studyId}:${parts.pilotDatasetHash}:${parts.extractorVersion}:${parts.requiredKeysHash}`
}

export const extractionBundleCache = {
  async get(key: string): Promise<ExtractionBundle | null> {
    const data = await redis.get(`extract:${key}`)
    if (!data) return null
    try {
      return JSON.parse(data) as ExtractionBundle
    } catch (e) {
      return null
    }
  },

  async set(key: string, value: ExtractionBundle): Promise<void> {
    await redis.set(`extract:${key}`, JSON.stringify(value), "EX", TTL_SECONDS)
  },
}
