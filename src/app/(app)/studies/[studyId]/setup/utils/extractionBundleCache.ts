import type { ExtractionBundle } from "@/src/app/(app)/studies/[studyId]/variables/types"

const DEFAULT_TTL_MS = 15 * 60 * 1000
const DEFAULT_MAX_ENTRIES = 50

type CacheEntry<T> = {
  value: T
  expiresAt: number
}

class LruTtlCache<T> {
  private readonly maxEntries: number
  private readonly ttlMs: number
  private readonly store = new Map<string, CacheEntry<T>>()

  constructor(options?: { maxEntries?: number; ttlMs?: number }) {
    this.maxEntries = options?.maxEntries ?? DEFAULT_MAX_ENTRIES
    this.ttlMs = options?.ttlMs ?? DEFAULT_TTL_MS
  }

  get(key: string): T | null {
    const entry = this.store.get(key)
    if (!entry) return null
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key)
      return null
    }
    // Refresh LRU order
    this.store.delete(key)
    this.store.set(key, entry)
    return entry.value
  }

  set(key: string, value: T): void {
    const expiresAt = Date.now() + this.ttlMs
    if (this.store.has(key)) {
      this.store.delete(key)
    }
    this.store.set(key, { value, expiresAt })
    this.evictIfNeeded()
  }

  private evictIfNeeded(): void {
    while (this.store.size > this.maxEntries) {
      const oldestKey = this.store.keys().next().value
      if (!oldestKey) return
      this.store.delete(oldestKey)
    }
  }
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

function getGlobalCache(): LruTtlCache<ExtractionBundle> {
  const globalAny = globalThis as typeof globalThis & {
    __extractionBundleCache?: LruTtlCache<ExtractionBundle>
  }
  if (!globalAny.__extractionBundleCache) {
    globalAny.__extractionBundleCache = new LruTtlCache<ExtractionBundle>()
  }
  return globalAny.__extractionBundleCache
}

export const extractionBundleCache = getGlobalCache()
