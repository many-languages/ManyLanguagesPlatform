"use server"

import { resolver } from "@blitzjs/rpc"
import { AuthorizationError } from "blitz"
import db from "db"
import { getAuthorizedSession } from "@/src/app/(auth)/utils/getAuthorizedSession"

async function findAdminStudies() {
  const studies = await db.study.findMany({
    include: {
      FeedbackTemplate: true,
      jatosStudyUploads: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return studies.map((study) => ({
    ...study,
    latestJatosStudyUpload: study.jatosStudyUploads[0] ?? null,
  }))
}

export type AdminStudyWithLatestUpload = Awaited<ReturnType<typeof findAdminStudies>>[number]

const getAdminStudies = resolver.pipe(resolver.authorize("ADMIN"), async () => {
  return findAdminStudies()
})

export async function getStudiesRsc() {
  const session = await getAuthorizedSession()
  if (session.role !== "ADMIN") {
    throw new AuthorizationError()
  }

  return findAdminStudies()
}

export default getAdminStudies
