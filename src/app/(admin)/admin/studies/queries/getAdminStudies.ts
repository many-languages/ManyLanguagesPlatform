"use server"

import { resolver } from "@blitzjs/rpc"
import { AuthorizationError } from "blitz"
import db from "db"
import { getAuthorizedSession } from "@/src/app/(auth)/utils/getAuthorizedSession"
import { isStaffAdmin } from "@/src/lib/auth/roles"
import { studyHasParticipantResponsesSafe } from "@/src/lib/studies"

async function findAdminStudies() {
  const studies = await db.study.findMany({
    include: {
      FeedbackTemplate: true,
      codebook: {
        include: {
          entries: {
            orderBy: { variableName: "asc" },
          },
        },
      },
      jatosStudyUploads: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  })

  const mapped = studies.map((study) => ({
    ...study,
    latestJatosStudyUpload: study.jatosStudyUploads[0] ?? null,
  }))

  return Promise.all(
    mapped.map(async (study) => ({
      ...study,
      hasParticipantResponses: await studyHasParticipantResponsesSafe(study.id),
    }))
  )
}

export type AdminStudyWithLatestUpload = Awaited<ReturnType<typeof findAdminStudies>>[number]

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
