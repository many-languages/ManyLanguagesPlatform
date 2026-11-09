import type { JatosStudyResult } from "@/src/types/jatos"
import { isFinishedResult } from "@/src/lib/jatos/utils/findStudyResultIdByComment"

/**
 * A retry hands a participant a fresh single-run link after their run was started but never
 * finished. It is only valid for single-run studies, and never once a finished run exists:
 * that would silently create a second response for someone who already completed the study.
 */
export function isParticipantRetryable(input: {
  workerType: string | null | undefined
  started: boolean
  finished: boolean
}): boolean {
  return input.workerType === "SINGLE" && input.started && !input.finished
}

/**
 * The JATOS result that represents a participant. After a retry one pseudonym can own several
 * results (failed attempts plus a later run), so prefer a FINISHED one, then the newest.
 */
export function pickParticipantStudyResult(
  results: readonly JatosStudyResult[],
  participant: { pseudonym: string; email: string }
): JatosStudyResult | undefined {
  const own = results.filter(
    (result) => result.comment === participant.pseudonym || result.comment === participant.email
  )
  if (own.length === 0) return undefined

  const byNewest = [...own].sort((a, b) => b.id - a.id)
  return byNewest.find(isFinishedResult) ?? byNewest[0]
}
