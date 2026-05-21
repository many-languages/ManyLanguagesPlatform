import { cache } from "react"
import db from "db"
import { getAuthorizedSession } from "@/src/lib/auth/session"

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

/** Batch membership lookup for a page of studies (e.g. Explore). */
export const getParticipantJoinedByStudyIdRsc = cache(async (studyIds: number[]) => {
  const session = await getAuthorizedSession()
  if (session.userId == null) {
    throw new Error("Not authenticated")
  }

  if (studyIds.length === 0) {
    return {} as Record<number, boolean>
  }

  const participations = await db.participantStudy.findMany({
    where: {
      userId: session.userId,
      studyId: { in: studyIds },
    },
    select: { studyId: true },
  })

  const joinedIds = new Set(participations.map((participation) => participation.studyId))

  return Object.fromEntries(studyIds.map((studyId) => [studyId, joinedIds.has(studyId)])) as Record<
    number,
    boolean
  >
})
