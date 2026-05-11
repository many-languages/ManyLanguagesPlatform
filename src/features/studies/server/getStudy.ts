import { AuthorizationError, NotFoundError } from "blitz"
import { cache } from "react"
import db from "db"
import type { UserRole } from "@/db"
import { getAuthorizedSession } from "@/src/app/(auth)/utils/getAuthorizedSession"
import { isStaffAdmin } from "@/src/lib/auth/roles"
import type { IdInput } from "../validations"
import { studyWithRelationsArgs } from "../studySelects"
import type { StudyWithRelations } from "../types"
import { withStudyAccess } from "./withStudyAccess"

function attachLatestJatosStudyUpload(
  study: Omit<StudyWithRelations, "latestJatosStudyUpload">
): StudyWithRelations {
  return {
    ...study,
    latestJatosStudyUpload: study.jatosStudyUploads[0] ?? null,
  }
}

async function findStudyById(id: number): Promise<StudyWithRelations> {
  const study = await db.study.findUnique({
    where: { id },
    ...studyWithRelationsArgs,
  })

  if (!study) {
    throw new NotFoundError()
  }

  return attachLatestJatosStudyUpload(study)
}

function canReadStudy(
  study: StudyWithRelations,
  userId: number,
  role: UserRole | string | null | undefined
) {
  return (
    isStaffAdmin(role) ||
    study.researchers.some((researcher) => researcher.userId === userId) ||
    study.participations.some((participant) => participant.userId === userId) ||
    (!study.archived && study.status === "OPEN")
  )
}

export const getStudyRsc = cache(async (id: IdInput) => {
  const session = await getAuthorizedSession()
  const userId = session.userId

  if (userId == null) {
    throw new AuthorizationError()
  }

  const study = await findStudyById(id)
  if (!canReadStudy(study, userId, session.role)) {
    throw new AuthorizationError()
  }

  return study
})

export const getResearcherStudyRsc = cache(async (id: IdInput) => {
  return withStudyAccess(id, async () => {
    return findStudyById(id)
  })
})
