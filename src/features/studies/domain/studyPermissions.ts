/**
 * Pure study membership rules for a loaded study. Database-level checks (Prisma `where` clauses
 * in server writes) enforce the same rule independently and must stay aligned with it.
 */

/** True when `userId` is the principal investigator (PI) of the study. */
export function isStudyPi(
  study: { researchers: ReadonlyArray<{ userId: number; role: string }> },
  userId: number | null | undefined
): boolean {
  return userId != null && study.researchers.some((r) => r.userId === userId && r.role === "PI")
}
