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
