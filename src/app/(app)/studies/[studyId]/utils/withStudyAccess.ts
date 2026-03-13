import { getBlitzContext } from "@/src/app/blitz-server"
import { verifyResearcherStudyAccess } from "./verifyResearchersStudyAccess"

type StudyCallback<T> = (studyId: number, userId: number) => Promise<T>

/**
 * Authorization-only wrapper: session retrieval + researcher study access verification.
 * Callers that need JATOS should use jatosAccessService directly (it handles token resolution).
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
