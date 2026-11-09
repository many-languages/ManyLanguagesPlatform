import type { JatosMetadata, JatosStudyResult } from "@/src/types/jatos"

/** A participant run only counts as completed when JATOS marked the study run FINISHED. */
function isFinishedResult(result: JatosStudyResult): boolean {
  return result.studyState === "FINISHED"
}

/**
 * Finds the studyResultId for a given comment (e.g., "test")
 * within full JATOS metadata returned by getResultsMetadata().
 *
 * @param metadata Full JSON response from JATOS /results/metadata
 * @param comment The comment string to match (e.g. "test")
 * @param options.finishedOnly Only match FINISHED runs (participants). Pilot lookups leave this off.
 * @returns The matching studyResult.id or null if not found
 */
export function findStudyResultIdByComment(
  metadata: JatosMetadata | null | undefined,
  comment: string,
  options: { finishedOnly?: boolean } = {}
): number | null {
  if (!metadata || !Array.isArray(metadata.data)) return null

  for (const studyMeta of metadata.data) {
    const results = studyMeta.studyResults ?? []
    const match = results.find(
      (res: JatosStudyResult) =>
        res.comment?.trim() === comment.trim() && (!options.finishedOnly || isFinishedResult(res))
    )
    if (match) return match.id
  }

  return null
}

/**
 * Finds all FINISHED study results for a given comment and returns the latest.
 * "Latest" is determined by `endDate` (descending), then `id` (descending).
 * Unfinished runs (no end date) are ignored: they have no complete data to show feedback for.
 */
export function findLatestStudyResultSelectionByComment(
  metadata: JatosMetadata | null | undefined,
  comment: string
): { resultId: number | null; matchCount: number; selectedEndDate: number | null } {
  if (!metadata || !Array.isArray(metadata.data)) {
    return { resultId: null, matchCount: 0, selectedEndDate: null }
  }

  const normalizedComment = comment.trim()
  const matches: JatosStudyResult[] = []

  for (const studyMeta of metadata.data) {
    const results = studyMeta.studyResults ?? []
    for (const res of results) {
      if (res.comment?.trim() === normalizedComment && isFinishedResult(res)) {
        matches.push(res)
      }
    }
  }

  if (matches.length === 0) return { resultId: null, matchCount: 0, selectedEndDate: null }

  const latest = [...matches].sort((a, b) => {
    const endDateDiff = (b.endDate ?? 0) - (a.endDate ?? 0)
    if (endDateDiff !== 0) return endDateDiff
    return b.id - a.id
  })[0]

  return {
    resultId: latest?.id ?? null,
    matchCount: matches.length,
    selectedEndDate: latest?.endDate ?? null,
  }
}

/**
 * Checks if a participant (by pseudonym) has completed (FINISHED) a specific JATOS study.
 * Use when metadata contains multiple studies and you need per-study completion.
 */
export function hasCompletedStudy(
  metadata: JatosMetadata,
  jatosStudyId: number,
  pseudonym: string
): boolean {
  const studyMeta = metadata.data?.find((s) => s.studyId === jatosStudyId)
  if (!studyMeta) return false
  return (
    studyMeta.studyResults?.some(
      (r) => r.comment?.trim() === pseudonym.trim() && isFinishedResult(r)
    ) ?? false
  )
}

/**
 * Finds the FINISHED JATOS study result for a participant (by pseudonym) in a specific study.
 * Returns the result object with completion date (endDate as Unix ms, null if JATOS has none) or null.
 */
export function findStudyResultByPseudonym(
  metadata: JatosMetadata,
  jatosStudyId: number,
  pseudonym: string
): { endDate: number | null } | null {
  const studyMeta = metadata.data?.find((s) => s.studyId === jatosStudyId)
  if (!studyMeta) return null
  const match = studyMeta.studyResults?.find(
    (r) => r.comment?.trim() === pseudonym.trim() && isFinishedResult(r)
  )
  return match ? { endDate: match.endDate } : null
}
