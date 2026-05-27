import { createHash, randomBytes } from "crypto"
import type { EnrichedJatosStudyResult } from "@/src/types/jatos"
import { redis } from "@/src/lib/redis"

/** Server-only snapshot for Step 6 feedback preview backed by Redis. */
export type StoredFeedbackPreviewContext = {
  studyId: number
  userId: number
  latestJatosStudyUploadId: number
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

/** 1 hour TTL */
const TTL_SECONDS = 60 * 60

export function hashPilotResultIds(ids: number[]): string {
  const payload = [...ids].sort((a, b) => a - b).join(",")
  return createHash("sha256").update(payload, "utf8").digest("hex")
}

export async function putFeedbackPreviewContext(
  ctx: StoredFeedbackPreviewContext
): Promise<string> {
  const key = randomBytes(32).toString("hex")
  const redisKey = `preview:${key}`

  await redis.set(redisKey, JSON.stringify(ctx), "EX", TTL_SECONDS)
  return key
}

export async function getFeedbackPreviewContext(
  key: string
): Promise<StoredFeedbackPreviewContext | null> {
  const data = await redis.get(`preview:${key}`)
  if (!data) return null
  try {
    return JSON.parse(data) as StoredFeedbackPreviewContext
  } catch (e) {
    return null
  }
}
