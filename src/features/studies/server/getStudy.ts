import { AuthorizationError, NotFoundError } from "blitz"
import { cache } from "react"
import db from "db"
import { getAuthorizedSession } from "@/src/lib/auth/session"
import { isStaffAdmin } from "@/src/lib/auth/roles"
import type { IdInput } from "../validations"
import { participantStudyOverviewArgs, studyWithRelationsArgs } from "../studySelects"
import type { ParticipantStudyOverview, StudyWithRelations } from "../types"
import { withStudyAccess } from "./withStudyAccess"

function attachLatestJatosStudyUpload<T extends { jatosStudyUploads: readonly unknown[] }>(
  study: T
): T & { latestJatosStudyUpload: T["jatosStudyUploads"][number] | null } {
  return {
    ...study,
    latestJatosStudyUpload: study.jatosStudyUploads[0] ?? null,
  }
}

async function findStudyWithRelationsById(id: number): Promise<StudyWithRelations> {
  const study = await db.study.findUnique({
    where: { id },
    ...studyWithRelationsArgs,
  })

  if (!study) {
    throw new NotFoundError()
  }

  return attachLatestJatosStudyUpload(study)
}

async function findParticipantStudyOverviewById(id: number): Promise<ParticipantStudyOverview> {
  const study = await db.study.findUnique({
    where: { id },
    ...participantStudyOverviewArgs,
  })

  if (!study) {
    throw new NotFoundError()
  }

  return attachLatestJatosStudyUpload(study)
}

async function isResearcherOnStudy(studyId: number, userId: number) {
  const researcher = await db.studyResearcher.findFirst({
    where: { studyId, userId },
    select: { id: true },
  })
  return Boolean(researcher)
}

async function isParticipantInStudy(studyId: number, userId: number) {
  const participation = await db.participantStudy.findUnique({
    where: { userId_studyId: { userId, studyId } },
    select: { id: true },
  })
  return Boolean(participation)
}

export const getStudyRsc = cache(async (id: IdInput) => {
  return getParticipantStudyOverviewRsc(id)
})

export const getResearcherStudyRsc = cache(async (id: IdInput) => {
  return withStudyAccess(id, async () => {
    return findStudyWithRelationsById(id)
  })
})

export const getParticipantStudyOverviewRsc = cache(async (id: IdInput) => {
  const session = await getAuthorizedSession()
  const userId = session.userId

  if (userId == null) {
    throw new AuthorizationError()
  }

  const study = await findParticipantStudyOverviewById(id)
  const canRead =
    isStaffAdmin(session.role) ||
    (await isParticipantInStudy(id, userId)) ||
    (!study.archived && study.status === "OPEN")

  if (!canRead) {
    throw new AuthorizationError()
  }

  return study
})

export const getStudyPageRsc = cache(async (id: IdInput) => {
  const session = await getAuthorizedSession()
  const userId = session.userId

  if (userId == null) {
    throw new AuthorizationError()
  }

  if (await isResearcherOnStudy(id, userId)) {
    return {
      kind: "researcher" as const,
      study: await findStudyWithRelationsById(id),
    }
  }

  return {
    kind: "participant" as const,
    study: await getParticipantStudyOverviewRsc(id),
  }
})
