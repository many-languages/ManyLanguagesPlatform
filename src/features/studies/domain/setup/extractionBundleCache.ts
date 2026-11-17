import type { ExtractionBundle } from "../variables/types"
import { redis } from "@/src/lib/redis"

const TTL_SECONDS = 15 * 60
// v2: Maps are now serialized properly (v1 entries stored them as `{}`)
const KEY_PREFIX = "extract:v2:"

// JSON.stringify turns Maps into `{}`, so tag them to restore on read.
function mapReplacer(_key: string, value: unknown) {
  if (value instanceof Map) {
    return { __type: "Map", entries: Array.from(value.entries()) }
  }
  return value
}

function mapReviver(_key: string, value: unknown) {
  if (
    value &&
    typeof value === "object" &&
    (value as { __type?: string }).__type === "Map" &&
    Array.isArray((value as { entries?: unknown }).entries)
  ) {
    return new Map((value as { entries: [unknown, unknown][] }).entries)
  }
  return value
}

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
    const data = await redis.get(`${KEY_PREFIX}${key}`)
    if (!data) return null
    try {
      return JSON.parse(data, mapReviver) as ExtractionBundle
    } catch (e) {
      return null
    }
  },

  async set(key: string, value: ExtractionBundle): Promise<void> {
    await redis.set(`${KEY_PREFIX}${key}`, JSON.stringify(value, mapReplacer), "EX", TTL_SECONDS)
  },
}
