import type { EnrichedJatosStudyResult } from "@/src/types/jatos"

/**
 * Outcome of loading JATOS study results for participant feedback (enrichment + optional across-stats).
 * Discriminated by `kind` — avoids ambiguous pairs like `success: false` with `completed: true`.
 */
export type GetParticipantFeedbackResult =
  | { kind: "not_completed" }
  | {
      kind: "loaded"
      enrichedResult: EnrichedJatosStudyResult
      /** Precomputed stat:…:across values; never includes raw cohort rows. */
      aggregatedAcrossStats?: Record<string, string>
    }
  | { kind: "failed"; error: string }
