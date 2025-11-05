import type { JatosMetadata } from "@/src/types/jatos"
import { parseDuration } from "@/src/lib/utils/parseDuration"

export interface StudySummaryResult {
  finished: number
  notFinished: number
  numComponents: number
  avgDurationSec: number
  avgDataSize: number
  latestLastSeenStr: string
}

/**
 * Calculates summary statistics from JATOS metadata.
 *
 * @param metadata - JATOS results metadata
 * @returns Summary statistics or null if no results available
 * @throws Error if data structure is malformed or invalid
 */
export function calculateStudySummary(metadata: JatosMetadata): StudySummaryResult | null {
  if (!metadata) {
    throw new Error("Metadata is required")
  }

  const study = metadata?.data?.[0]

  if (!study) {
    return null
  }

  const studyResults = study.studyResults ?? []

  if (!studyResults.length) {
    return null
  }

  try {
    // 1️⃣ Finished / not finished participants
    const finished = studyResults.filter((r) => r.studyState === "FINISHED").length
    const notFinished = studyResults.length - finished

    // 2️⃣ Unique component count
    const allComponents = studyResults.flatMap((r) => r.componentResults || [])
    const numComponents = new Set(allComponents.map((c) => c.componentId)).size

    // 3️⃣ Average duration (in seconds) - filter invalid values
    const durations = allComponents
      .map((c) => parseDuration(c.duration))
      .filter((n) => !isNaN(n) && isFinite(n) && n >= 0)

    const avgDurationSec =
      durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0

    // 4️⃣ Average data size (bytes) - filter invalid values
    const sizes = allComponents
      .map((c) => c.data?.size ?? 0)
      .filter((size) => size >= 0 && isFinite(size))

    const avgDataSize = sizes.length > 0 ? sizes.reduce((a, b) => a + b, 0) / sizes.length : 0

    // 5️⃣ Latest lastSeenDate (epoch ms) - filter invalid values
    const lastSeenDates = studyResults
      .map((r) => r.lastSeenDate ?? 0)
      .filter((date) => date > 0 && isFinite(date))

    const latestLastSeen = lastSeenDates.length > 0 ? Math.max(...lastSeenDates) : 0
    const latestLastSeenStr = latestLastSeen > 0 ? new Date(latestLastSeen).toLocaleString() : "N/A"

    return {
      finished,
      notFinished,
      numComponents,
      avgDurationSec,
      avgDataSize,
      latestLastSeenStr,
    }
  } catch (error) {
    throw new Error(
      `Failed to calculate study summary: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    )
  }
}
