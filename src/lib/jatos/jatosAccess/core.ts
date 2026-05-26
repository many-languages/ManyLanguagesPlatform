import db from "db"
import { getTokenForResearcher, getTokenForStudyService } from "../tokenBroker"
import { getResultsData } from "../client/getResultsData"
import { parseJatosZip } from "../parsers/parseJatosZip"
import { matchJatosDataToMetadata } from "../utils/matchJatosDataToMetadata"
import type { JatosMetadata, EnrichedJatosStudyResult } from "@/src/types/jatos"
import { JatosTransportError } from "../errors"

export async function assertResearcherCanAccessStudy({
  studyId,
  userId,
}: {
  studyId: number
  userId: number
}): Promise<void> {
  const researcher = await db.studyResearcher.findFirst({
    where: { studyId, userId },
  })
  if (!researcher) {
    throw new Error("You are not authorized to access this study.")
  }
}

export async function assertParticipantCanAccessStudy({
  studyId,
  pseudonym,
  userId,
  participantStudyId,
}: {
  studyId: number
  pseudonym: string
  userId: number
  participantStudyId?: number
}): Promise<void> {
  const participant = await db.participantStudy.findUnique({
    where: { userId_studyId: { userId, studyId } },
    select: { id: true, pseudonym: true },
  })
  if (!participant) {
    throw new Error("Participant not found for this study")
  }
  if (participantStudyId != null && participant.id !== participantStudyId) {
    throw new Error("Participant record does not match authenticated study membership")
  }
  if (participant.pseudonym !== pseudonym) {
    throw new Error("Pseudonym does not match authenticated user")
  }
}

export async function assertJatosStudyBelongsToStudy({
  studyId,
  jatosStudyId,
}: {
  studyId: number
  jatosStudyId: number
}): Promise<void> {
  const upload = await db.jatosStudyUpload.findFirst({
    where: { studyId, jatosStudyId },
    select: { id: true },
  })
  if (!upload) {
    throw new Error("JATOS study does not belong to this app study.")
  }
}

export async function assertJatosStudyUuidBelongsToStudy({
  studyId,
  jatosStudyUUID,
}: {
  studyId: number
  jatosStudyUUID: string
}): Promise<void> {
  const study = await db.study.findFirst({
    where: { id: studyId, jatosStudyUUID },
    select: { id: true },
  })
  if (!study) {
    throw new Error("JATOS study UUID does not belong to this app study.")
  }
}

export async function assertJatosUploadBelongsToStudy({
  studyId,
  jatosStudyUploadId,
  jatosStudyId,
}: {
  studyId: number
  jatosStudyUploadId: number
  jatosStudyId?: number
}): Promise<void> {
  const upload = await db.jatosStudyUpload.findFirst({
    where: {
      id: jatosStudyUploadId,
      studyId,
      ...(jatosStudyId == null ? {} : { jatosStudyId }),
    },
    select: { id: true },
  })
  if (!upload) {
    throw new Error("JATOS upload does not belong to this app study.")
  }
}

export async function assertJatosStudyIdsBelongToParticipant({
  userId,
  jatosStudyIds,
}: {
  userId: number
  jatosStudyIds: number[]
}): Promise<void> {
  const uniqueIds = [...new Set(jatosStudyIds)]
  if (uniqueIds.length === 0) return

  const participations = await db.participantStudy.findMany({
    where: {
      userId,
      study: {
        jatosStudyUploads: {
          some: { jatosStudyId: { in: uniqueIds } },
        },
      },
    },
    select: {
      study: {
        select: {
          jatosStudyUploads: {
            where: { jatosStudyId: { in: uniqueIds } },
            select: { jatosStudyId: true },
          },
        },
      },
    },
  })

  const authorizedIds = new Set(
    participations.flatMap((participation) =>
      participation.study.jatosStudyUploads.map((upload) => upload.jatosStudyId)
    )
  )
  const unauthorizedId = uniqueIds.find((id) => !authorizedIds.has(id))
  if (unauthorizedId != null) {
    throw new Error("JATOS study does not belong to an authenticated participant study.")
  }
}

export async function assertStudyUuidsBelongToResearcher({
  userId,
  studyUuids,
}: {
  userId: number
  studyUuids: string[]
}): Promise<void> {
  const uniqueUuids = [...new Set(studyUuids.map((uuid) => uuid.trim()).filter(Boolean))]
  if (uniqueUuids.length === 0) return

  const studies = await db.study.findMany({
    where: {
      jatosStudyUUID: { in: uniqueUuids },
      researchers: { some: { userId } },
    },
    select: { jatosStudyUUID: true },
  })

  const authorizedUuids = new Set(
    studies.map((study) => study.jatosStudyUUID).filter((uuid): uuid is string => Boolean(uuid))
  )
  const unauthorizedUuid = uniqueUuids.find((uuid) => !authorizedUuids.has(uuid))
  if (unauthorizedUuid) {
    throw new Error("JATOS study UUID does not belong to an authorized researcher study.")
  }
}

export async function getStudyJatosInfo(studyId: number): Promise<{
  jatosStudyId: number
  jatosStudyUUID: string
} | null> {
  const upload = await db.jatosStudyUpload.findFirst({
    where: { studyId },
    orderBy: { createdAt: "desc" },
    select: { jatosStudyId: true },
  })
  const study = await db.study.findUnique({
    where: { id: studyId },
    select: { jatosStudyUUID: true },
  })
  if (!upload || !study?.jatosStudyUUID) return null
  return { jatosStudyId: upload.jatosStudyId, jatosStudyUUID: study.jatosStudyUUID }
}

export async function getLatestStudyJatosInfo(studyId: number): Promise<{
  jatosStudyId: number
  jatosStudyUUID: string
} | null> {
  const upload = await db.jatosStudyUpload.findFirst({
    where: { studyId },
    orderBy: { versionNumber: "desc" },
    select: { jatosStudyId: true },
  })
  const study = await db.study.findUnique({
    where: { id: studyId },
    select: { jatosStudyUUID: true },
  })
  const jatosStudyUUID = study?.jatosStudyUUID?.trim()
  if (!upload || !jatosStudyUUID) return null
  return { jatosStudyId: upload.jatosStudyId, jatosStudyUUID }
}

export function getJatosResponseCheckErrorDetail(error: unknown): string {
  if (error instanceof JatosTransportError) return error.message
  if (error instanceof Error) return error.message
  return "Unknown error"
}

export async function withResearcherToken<T>(
  input: { studyId: number; userId: number },
  callback: (ctx: { studyId: number; userId: number; token: string }) => Promise<T>
): Promise<T> {
  return withResearcherAccess(input, async ({ studyId, userId }) => {
    const token = await getTokenForResearcher(userId)
    return callback({ studyId, userId, token })
  })
}

export async function withResearcherAccess<T>(
  input: { studyId: number; userId: number },
  callback: (ctx: { studyId: number; userId: number }) => Promise<T>
): Promise<T> {
  await assertResearcherCanAccessStudy(input)
  return callback(input)
}

export async function withParticipantViewerToken<T>(
  input: {
    studyId: number
    pseudonym: string
    userId: number
    jatosStudyId: number
    participantStudyId?: number
  },
  callback: (ctx: {
    studyId: number
    pseudonym: string
    userId: number
    jatosStudyId: number
    token: string
  }) => Promise<T>
): Promise<T> {
  await assertParticipantCanAccessStudy({
    studyId: input.studyId,
    pseudonym: input.pseudonym,
    userId: input.userId,
    participantStudyId: input.participantStudyId,
  })
  await assertJatosStudyBelongsToStudy({
    studyId: input.studyId,
    jatosStudyId: input.jatosStudyId,
  })
  const token = await getTokenForStudyService(input.jatosStudyId)
  return callback({ ...input, token })
}

const RESEARCHER_ROLE_PRIORITY: Record<string, number> = {
  PI: 0,
  COLLABORATOR: 1,
  VIEWER: 2,
}

export async function getEligibleResearcherForStudy(studyId: number): Promise<number> {
  const researchers = await db.studyResearcher.findMany({
    where: { studyId },
    orderBy: [{ createdAt: "asc" }, { userId: "asc" }],
    take: 20,
    select: { userId: true, role: true, createdAt: true },
  })
  if (researchers.length === 0) {
    throw new Error("Study has no researchers; cannot create participant study code.")
  }
  const sorted = [...researchers].sort((a, b) => {
    const pa = RESEARCHER_ROLE_PRIORITY[a.role] ?? 999
    const pb = RESEARCHER_ROLE_PRIORITY[b.role] ?? 999
    if (pa !== pb) return pa - pb
    const ca = a.createdAt.getTime()
    const cb = b.createdAt.getTime()
    if (ca !== cb) return ca - cb
    return a.userId - b.userId
  })
  return sorted[0]!.userId
}

export async function withParticipantAccessAndResearcherToken<T>(
  input: {
    studyId: number
    pseudonym: string
    userId: number
    jatosStudyId: number
    participantStudyId?: number
  },
  callback: (ctx: {
    studyId: number
    pseudonym: string
    userId: number
    jatosStudyId: number
    token: string
  }) => Promise<T>
): Promise<T> {
  await assertParticipantCanAccessStudy({
    studyId: input.studyId,
    pseudonym: input.pseudonym,
    userId: input.userId,
    participantStudyId: input.participantStudyId,
  })
  await assertJatosStudyBelongsToStudy({
    studyId: input.studyId,
    jatosStudyId: input.jatosStudyId,
  })
  const researcherUserId = await getEligibleResearcherForStudy(input.studyId)
  const token = await getTokenForResearcher(researcherUserId)
  return callback({ ...input, token })
}

export async function fetchZipParseAndEnrich(input: {
  metadata: JatosMetadata
  token: string
  getResultsParams: Record<string, unknown>
}): Promise<EnrichedJatosStudyResult[]> {
  const result = await getResultsData(input.getResultsParams, { token: input.token })
  if (!result.success) throw new Error("Failed to fetch results from JATOS")
  const files = await parseJatosZip(result.data)
  return matchJatosDataToMetadata(input.metadata, files)
}
