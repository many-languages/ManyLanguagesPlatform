import type { JatosMetadata, JatosStudyResult } from "@/src/types/jatos"

/**
 * Finds the studyResultId for a given comment (e.g., "test")
 * within full JATOS metadata returned by getResultsMetadata().
 *
 * @param metadata Full JSON response from JATOS /results/metadata
 * @param comment The comment string to match (e.g. "test")
 * @returns The matching studyResult.id or null if not found
 */
export function findStudyResultIdByComment(
  metadata: JatosMetadata | null | undefined,
  comment: string
): number | null {
  if (!metadata || !Array.isArray(metadata.data)) return null

  for (const studyMeta of metadata.data) {
    const results = studyMeta.studyResults ?? []
    const match = results.find((res: JatosStudyResult) => res.comment?.trim() === comment.trim())
    if (match) return match.id
  }

  return null
}

/**
 * Finds all matching study results for a given comment and returns the latest.
 * "Latest" is determined by `endDate` (descending), then `id` (descending).
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
      if (res.comment?.trim() === normalizedComment) {
        matches.push(res)
      }
    }
  }

  if (matches.length === 0) return { resultId: null, matchCount: 0, selectedEndDate: null }

  const latest = [...matches].sort((a, b) => {
    const endDateDiff = b.endDate - a.endDate
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
 * Checks if a participant (by pseudonym) has completed a specific JATOS study.
 * Use when metadata contains multiple studies and you need per-study completion.
 */
export function hasCompletedStudy(
  metadata: JatosMetadata,
  jatosStudyId: number,
  pseudonym: string
): boolean {
  const studyMeta = metadata.data?.find((s) => s.studyId === jatosStudyId)
  if (!studyMeta) return false
  return studyMeta.studyResults?.some((r) => r.comment?.trim() === pseudonym.trim()) ?? false
}

/**
 * Finds the JATOS study result for a participant (by pseudonym) in a specific study.
 * Returns the result object with completion date (endDate as Unix ms) or null.
 */
export function findStudyResultByPseudonym(
  metadata: JatosMetadata,
  jatosStudyId: number,
  pseudonym: string
): { endDate: number } | null {
  const studyMeta = metadata.data?.find((s) => s.studyId === jatosStudyId)
  if (!studyMeta) return null
  const match = studyMeta.studyResults?.find((r) => r.comment?.trim() === pseudonym.trim())
  return match ? { endDate: match.endDate } : null
}
