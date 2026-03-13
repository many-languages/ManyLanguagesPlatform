import db from "db"
import { removeStudyMember } from "../api/admin/removeStudyMember"

/**
 * Removes a researcher from a JATOS study's members.
 * Looks up the researcher's JATOS user ID and calls the JATOS API to remove them.
 * No-op if the researcher has no ResearcherJatos record (e.g. never provisioned).
 */
export async function removeResearcherFromJatosStudy(
  userId: number,
  jatosStudyId: number
): Promise<void> {
  const researcherJatos = await db.researcherJatos.findUnique({
    where: { userId },
    select: { jatosUserId: true },
  })

  if (!researcherJatos) {
    return
  }

  await removeStudyMember({
    studyId: jatosStudyId,
    userId: researcherJatos.jatosUserId,
  })
}
