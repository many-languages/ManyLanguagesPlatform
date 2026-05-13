import { cache } from "react"
import db from "db"
import { getAuthorizedSession } from "@/src/lib/auth/session"

async function findStudyParticipant(studyId: number, userId: number) {
  return db.participantStudy.findUnique({
    where: { userId_studyId: { userId, studyId } },
    select: {
      id: true,
      pseudonym: true,
      jatosRunUrl: true,
      createdAt: true,
      active: true,
      payed: true,
    },
  })
}

export const getStudyParticipantRsc = cache(async (studyId: number) => {
  const session = await getAuthorizedSession()
  if (session.userId == null) {
    throw new Error("Not authenticated")
  }

  return findStudyParticipant(studyId, session.userId)
})
