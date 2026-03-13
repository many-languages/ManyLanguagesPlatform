import type { JatosMetadata } from "@/src/types/jatos"

/**
 * Finds the studyResultId for a given comment (e.g., "test")
 * within full JATOS metadata returned by getResultsMetadata().
 *
 * @param metadata Full JSON response from JATOS /results/metadata
 * @param comment The comment string to match (e.g. "test")
 * @returns The matching studyResult.id or null if not found
 */
export function findStudyResultIdByComment(metadata: any, comment: string): number | null {
  if (!metadata || !Array.isArray(metadata.data)) return null

  for (const studyMeta of metadata.data) {
    const results = studyMeta.studyResults ?? []
    const match = results.find((res: any) => res.comment?.trim() === comment.trim())
    if (match) return match.id
  }

  return null
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
