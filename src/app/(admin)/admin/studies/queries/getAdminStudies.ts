"use server"

import { resolver } from "@blitzjs/rpc"
import { AuthorizationError } from "blitz"
import db from "db"
import { getAuthorizedSession } from "@/src/app/(auth)/utils/getAuthorizedSession"

const getAdminStudies = resolver.pipe(resolver.authorize("ADMIN"), async () => {
  return db.study.findMany({
    include: {
      FeedbackTemplate: true,
    },
    orderBy: { createdAt: "desc" },
  })
})

export async function getStudiesRsc() {
  const session = await getAuthorizedSession()
  if (session.role !== "ADMIN") {
    throw new AuthorizationError()
  }

  return db.study.findMany({
    include: {
      FeedbackTemplate: true,
    },
    orderBy: { createdAt: "desc" },
  })
}

export default getAdminStudies
