import { resolver } from "@blitzjs/rpc"
import db from "db"
import { cache } from "react"
import { z } from "zod"
import { getBlitzContext } from "@/src/app/blitz-server"

const GetResearcherRunUrl = z.object({
  studyId: z.number(),
})

// Server-side helper for RSCs
export const getResearcherRunUrlRsc = cache(async (studyId: number) => {
  const { session } = await getBlitzContext()
  if (!session.userId) throw new Error("Not authenticated")

  const researcher = await db.studyResearcher.findFirst({
    where: { studyId, userId: session.userId },
    select: { id: true, studyId: true },
  })

  if (!researcher) throw new Error("You are not assigned to this study")

  const latestUpload = await db.jatosStudyUpload.findFirst({
    where: { studyId: researcher.studyId },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  })

  const latestPilotLink = latestUpload
    ? await db.pilotLink.findFirst({
        where: {
          studyResearcherId: researcher.id,
          jatosStudyUploadId: latestUpload.id,
        },
        orderBy: { createdAt: "desc" },
        select: { jatosRunUrl: true },
      })
    : null

  return {
    id: researcher.id,
    jatosRunUrl: latestPilotLink?.jatosRunUrl ?? null,
  }
})

// Blitz RPC for client usage
export default resolver.pipe(
  resolver.zod(GetResearcherRunUrl),
  resolver.authorize("RESEARCHER"),
  async ({ studyId }) => {
    return getResearcherRunUrlRsc(studyId)
  }
)
