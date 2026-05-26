import { AuthenticationError, AuthorizationError } from "blitz"
import { UserRole } from "@/db"
import db from "db"
import { getAuthorizedUserId } from "@/src/lib/auth/getAuthorizedUserId"
import { getAuthorizedSession } from "@/src/lib/auth/session"
import { participantStudyJoinResultSelect, type JoinStudyResult } from "../studySelects"
import { assertStudyNotArchived } from "./studyLifecycle"
import { verifyResearcherStudyAccess } from "./verifyResearcherStudyAccess"

export type { JoinStudyResult }

export async function joinStudy(studyId: number): Promise<JoinStudyResult> {
  const session = await getAuthorizedSession()
  const userId = getAuthorizedUserId(session)

  if (session.role !== UserRole.PARTICIPANT) {
    throw new AuthorizationError("Only participants can join studies")
  }

  const existing = await db.participantStudy.findUnique({
    where: { userId_studyId: { userId, studyId } },
    select: participantStudyJoinResultSelect,
  })

  if (existing) {
    return existing
  }

  return db.participantStudy.create({
    data: {
      userId,
      studyId,
    },
    select: participantStudyJoinResultSelect,
  })
}

export async function saveParticipantRunUrl(input: {
  participantStudyId: number
  jatosRunUrl: string
  studyId?: number
}) {
  const session = await getAuthorizedSession()
  const participant = await db.participantStudy.findUnique({
    where: { id: input.participantStudyId },
    select: { userId: true, studyId: true },
  })

  if (
    !participant ||
    participant.userId !== session.userId ||
    (input.studyId != null && participant.studyId !== input.studyId)
  ) {
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
