"use server"

import { resolver } from "@blitzjs/rpc"
import { AuthorizationError } from "blitz"
import db from "db"
import { getAuthorizedSession } from "@/src/app/(auth)/utils/getAuthorizedSession"
import { isStaffAdmin } from "@/src/lib/auth/roles"
import { studyHasParticipantResponsesSafe } from "../server/participantResponses"
import { adminStudyWithLatestUploadArgs } from "../studySelects"
import type { AdminStudyWithLatestUpload } from "../types"

function attachLatestJatosStudyUpload(
  study: Omit<AdminStudyWithLatestUpload, "latestJatosStudyUpload" | "hasParticipantResponses">
): Omit<AdminStudyWithLatestUpload, "hasParticipantResponses"> {
  return {
    ...study,
    latestJatosStudyUpload: study.jatosStudyUploads[0] ?? null,
  }
}

async function findAdminStudies(): Promise<AdminStudyWithLatestUpload[]> {
  const studies = await db.study.findMany({
    ...adminStudyWithLatestUploadArgs,
    orderBy: { createdAt: "desc" },
  })

  const mapped = studies.map(attachLatestJatosStudyUpload)

  return Promise.all(
    mapped.map(async (study) => ({
      ...study,
      hasParticipantResponses: await studyHasParticipantResponsesSafe(study.id),
    }))
  )
}

const getAdminStudies = resolver.pipe(resolver.authorize(["ADMIN", "SUPERADMIN"]), async () => {
  return findAdminStudies()
})

export async function getStudiesRsc() {
  const session = await getAuthorizedSession()
  if (!isStaffAdmin(session.role)) {
    throw new AuthorizationError()
  }

  return findAdminStudies()
}

export default getAdminStudies
