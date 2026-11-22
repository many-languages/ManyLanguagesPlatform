/**
 * Separation of duties for admin review: an admin may not approve or reject a study they are a
 * researcher on, even when one account holds both roles. Another admin has to review it.
 */

type StudyWithResearchers = {
  id: number
  title?: string | null
  researchers: ReadonlyArray<{ userId: number }>
}

/** Studies in `studies` that `reviewerUserId` is a researcher on. */
export function getStudiesUnderOwnReview<T extends StudyWithResearchers>(
  studies: readonly T[],
  reviewerUserId: number | null | undefined
): T[] {
  if (reviewerUserId == null) return []
  return studies.filter((study) =>
    study.researchers.some((researcher) => researcher.userId === reviewerUserId)
  )
}

export function formatStudyLabels(studies: ReadonlyArray<{ id: number; title?: string | null }>) {
  return studies.map((study) => study.title?.trim() || `Study #${study.id}`).join(", ")
}

export function selfReviewBlockedMessage(
  action: "approve" | "reject",
  studies: ReadonlyArray<{ id: number; title?: string | null }>
): string {
  return (
    `You cannot ${action} studies you are a researcher on. ` +
    `Another admin has to review: ${formatStudyLabels(studies)}`
  )
}
