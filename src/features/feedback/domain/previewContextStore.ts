import { createHash, randomBytes } from "crypto"
import type { EnrichedJatosStudyResult } from "@/src/types/jatos"

/** Server-only snapshot for Step 6 feedback preview. Replace backing store with Redis using the same key/value shape. */
export type StoredFeedbackPreviewContext = {
  studyId: number
  userId: number
  latestJatosStudyUploadId: number
  /** Approved extraction snapshot id (key resolution); not the feedback template row. */
  approvedExtractionId: number | null
  pilotDatasetHash: string
  previewContextVersion: string
  primaryPilotResultId: number | null
  pilotResultIds: number[]
  pilotResultCount: number
  allowedVariableNames: string[]
  hiddenVariableNames: string[]
  allPilotResults: EnrichedJatosStudyResult[]
}

/**
 * Next.js can evaluate this module in multiple server bundles (RSC vs server actions). Plain
 * module-level `Map`s are not shared; `globalThis` keeps one store per Node process until Redis.
 */
type PreviewStoreGlobal = typeof globalThis & {
  __ManyLanguages_feedbackPreviewStore?: Map<string, StoredFeedbackPreviewContext>
  __ManyLanguages_feedbackPreviewStoredAtMs?: Map<string, number>
}

function ensurePreviewMaps(): {
  store: Map<string, StoredFeedbackPreviewContext>
  storedAtMs: Map<string, number>
} {
  const g = globalThis as PreviewStoreGlobal
  if (!g.__ManyLanguages_feedbackPreviewStore) {
    g.__ManyLanguages_feedbackPreviewStore = new Map()
  }
  if (!g.__ManyLanguages_feedbackPreviewStoredAtMs) {
    g.__ManyLanguages_feedbackPreviewStoredAtMs = new Map()
  }
  return {
    store: g.__ManyLanguages_feedbackPreviewStore,
    storedAtMs: g.__ManyLanguages_feedbackPreviewStoredAtMs,
  }
}

const { store, storedAtMs } = ensurePreviewMaps()

/** Default TTL for in-memory entries (per server instance). */
const TTL_MS = 60 * 60 * 1000

const MAX_ENTRIES = 5000

export function hashPilotResultIds(ids: number[]): string {
  const payload = [...ids].sort((a, b) => a - b).join(",")
  return createHash("sha256").update(payload, "utf8").digest("hex")
}

export function putFeedbackPreviewContext(ctx: StoredFeedbackPreviewContext): string {
  maybePrune()
  const key = randomBytes(32).toString("hex")
  store.set(key, ctx)
  storedAtMs.set(key, Date.now())
  return key
}

export function getFeedbackPreviewContext(key: string): StoredFeedbackPreviewContext | null {
  const t = storedAtMs.get(key)
  if (t === undefined) return null
  if (Date.now() - t > TTL_MS) {
    store.delete(key)
    storedAtMs.delete(key)
    return null
  }
  return store.get(key) ?? null
}

function maybePrune(): void {
  const now = Date.now()
  for (const [k, t] of [...storedAtMs.entries()]) {
    if (now - t > TTL_MS) {
      store.delete(k)
      storedAtMs.delete(k)
    }
  }
  if (store.size < MAX_ENTRIES) return
  const oldestFirst = [...storedAtMs.entries()].sort((a, b) => a[1] - b[1])
  const dropCount = Math.ceil(store.size * 0.25)
  for (let i = 0; i < dropCount && i < oldestFirst.length; i++) {
    const k = oldestFirst[i]![0]
    store.delete(k)
    storedAtMs.delete(k)
  }
}
