import { provisionResearcherJatos } from "./provisionResearcherJatos"
import { addStudyMember } from "../api/admin/addStudyMember"

/**
 * Ensures a researcher is a member of a JATOS study.
 * Provisions the researcher's JATOS user if needed, then adds them as a study member.
 * Idempotent: safe to call multiple times.
 */
export async function ensureResearcherJatosMember(
  userId: number,
  jatosStudyId: number
): Promise<void> {
  const { jatosUserId } = await provisionResearcherJatos(userId)
  await addStudyMember({ studyId: jatosStudyId, userId: jatosUserId })
}
