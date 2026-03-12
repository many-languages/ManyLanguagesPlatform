import { getBlitzContext } from "@/src/app/blitz-server"
import { getTokenForResearcher } from "@/src/lib/jatos/getTokenForResearcher"
import { verifyResearcherStudyAccess } from "./verifyResearchersStudyAccess"

type StudyCallback<T> = (studyId: number, userId: number, token: string) => Promise<T>

/**
 * A wrapper that handles:
 * 1. Session retrieval & type narrowing
 * 2. Specific Study Access verification
 * 3. JATOS token resolution for researcher-initiated operations
 * 4. Consistent error handling
 */
export async function withStudyAccess<T>(studyId: number, callback: StudyCallback<T>): Promise<T> {
  const { session } = await getBlitzContext()
  const userId = session.userId

  if (userId === null || userId === undefined) {
    throw new Error("Not authenticated")
  }

  // Ensure user has access to this specific study
  await verifyResearcherStudyAccess(studyId, userId)

  // Resolve JATOS token for researcher-initiated operations
  const token = await getTokenForResearcher(userId)

  // Pass control to the specific data fetcher
  return await callback(studyId, userId, token)
}
