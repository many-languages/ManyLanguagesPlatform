import { cache } from "react"
import db from "db"
import { getAuthorizedSession } from "@/src/app/(auth)/utils/getAuthorizedSession"

async function checkParticipantInStudy(studyId: number, userId: number) {
  const participant = await db.participantStudy.findUnique({
    where: { userId_studyId: { userId, studyId } },
    select: { id: true },
  })

  return { joined: !!participant }
}

export const isParticipantInStudyRsc = cache(async (studyId: number) => {
  const session = await getAuthorizedSession()
  if (session.userId == null) {
    throw new Error("Not authenticated")
  }

  return checkParticipantInStudy(studyId, session.userId)
})
