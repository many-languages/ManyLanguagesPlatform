import { getBlitzContext } from "@/src/app/blitz-server"
import { verifyResearcherStudyAccess } from "./verifyResearchersStudyAccess"

type StudyCallback<T> = (studyId: number, userId: number) => Promise<T>

/**
 * App-level access helper for researcher-authenticated operations.
 *
 * Responsibilities:
 * - Session retrieval (getBlitzContext)
 * - App-level researcher access check via DB (verifyResearcherStudyAccess)
 *
 * Does NOT: resolve JATOS tokens, call JATOS, or touch jatosClient.
 *
 * Use for:
 * - DB-only flows (variables, codebook, feedback, setup completion, etc.)
 * - Mixed DB + JATOS flows when early app-level authorization is needed before DB work.
 *   In mixed flows, the callback may call jatosAccessService for JATOS operations.
 *   Duplicated access checks (here and inside jatosAccessService) are acceptable.
 */
export async function withStudyAccess<T>(studyId: number, callback: StudyCallback<T>): Promise<T> {
  const { session } = await getBlitzContext()
  const userId = session.userId

  if (userId === null || userId === undefined) {
    throw new Error("Not authenticated")
  }

  await verifyResearcherStudyAccess(studyId, userId)

  return await callback(studyId, userId)
}
