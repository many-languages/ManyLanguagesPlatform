import { cache } from "react"
import db from "db"
import { getAuthorizedSession } from "@/src/lib/auth/session"

async function findParticipantPseudonym(studyId: number, userId: number) {
  const participantStudy = await db.participantStudy.findUnique({
    where: { userId_studyId: { userId, studyId } },
    select: { pseudonym: true },
  })

  if (!participantStudy) {
    throw new Error("Participant not found for this study")
  }

  return participantStudy
}

export const getParticipantPseudonymRsc = cache(async (studyId: number) => {
  const session = await getAuthorizedSession()
  if (session.userId == null) {
    throw new Error("Not authenticated")
  }

  return findParticipantPseudonym(studyId, session.userId)
})
