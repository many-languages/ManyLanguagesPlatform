import { AuthenticationError } from "blitz"
import db from "db"
import { getAuthorizedSession } from "@/src/lib/auth/session"
import { assertStudyNotArchived } from "./studyLifecycle"
import { verifyResearcherStudyAccess } from "./verifyResearcherStudyAccess"

export async function joinStudy(studyId: number) {
  const session = await getAuthorizedSession()
  const userId = session.userId

  if (!userId) {
    throw new Error("You must be logged in to join a study")
  }

  const existing = await db.participantStudy.findUnique({
    where: { userId_studyId: { userId, studyId } },
  })

  if (existing) {
    return existing
  }

  return db.participantStudy.create({
    data: {
      userId,
      studyId,
    },
  })
}

export async function saveParticipantRunUrl(input: {
  participantStudyId: number
  jatosRunUrl: string
}) {
  const session = await getAuthorizedSession()
  const participant = await db.participantStudy.findUnique({
    where: { id: input.participantStudyId },
    select: { userId: true },
  })

  if (!participant || participant.userId !== session.userId) {
    throw new AuthenticationError("Unauthorized access to participant record")
  }

  return db.participantStudy.update({
    where: { id: input.participantStudyId },
    data: { jatosRunUrl: input.jatosRunUrl },
  })
}

async function resolveSingleStudyIdForParticipants(participantIds: number[]): Promise<number> {
  if (participantIds.length === 0) {
    throw new Error("No participants selected.")
  }

  const rows = await db.participantStudy.findMany({
    where: { id: { in: participantIds } },
    select: { id: true, studyId: true },
  })

  if (rows.length !== participantIds.length) {
    throw new Error("One or more participants not found.")
  }

  const studyIds = [...new Set(rows.map((row) => row.studyId))]
  if (studyIds.length !== 1) {
    throw new Error("Participants must belong to a single study.")
  }

  return studyIds[0]!
}

export async function toggleParticipantActive(input: {
  participantIds: number[]
  makeActive: boolean
}) {
  const session = await getAuthorizedSession()
  const userId = session.userId

  if (!userId) {
    throw new Error("Not authenticated")
  }

  const studyId = await resolveSingleStudyIdForParticipants(input.participantIds)
  await verifyResearcherStudyAccess(studyId, userId)
  await assertStudyNotArchived(studyId)

  return db.participantStudy.updateMany({
    where: { id: { in: input.participantIds } },
    data: { active: input.makeActive },
  })
}

export async function toggleParticipantPayed(input: {
  participantIds: number[]
  makePayed: boolean
}) {
  const session = await getAuthorizedSession()
  const userId = session.userId

  if (!userId) {
    throw new Error("Not authenticated")
  }

  const studyId = await resolveSingleStudyIdForParticipants(input.participantIds)
  await verifyResearcherStudyAccess(studyId, userId)
  await assertStudyNotArchived(studyId)

  return db.participantStudy.updateMany({
    where: { id: { in: input.participantIds } },
    data: { payed: input.makePayed },
  })
}
