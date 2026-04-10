import { assertStudyNotArchived } from "@/src/lib/studies"
import { withStudyAccess } from "./withStudyAccess"

type StudyCallback<T> = (studyId: number, userId: number) => Promise<T>

/**
 * Researcher membership plus write policy (e.g. study not archived).
 * Use for mutations; use {@link withStudyAccess} for read-only queries.
 */
export async function withStudyWriteAccess<T>(
  studyId: number,
  callback: StudyCallback<T>
): Promise<T> {
  return withStudyAccess(studyId, async (id, userId) => {
    await assertStudyNotArchived(id)
    return callback(id, userId)
  })
}
