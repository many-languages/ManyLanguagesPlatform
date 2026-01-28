import { getResultsMetadata } from "@/src/lib/jatos/api/getResultsMetadata"
import { resolver } from "@blitzjs/rpc"
import db from "db"
import { cache } from "react"
import { z } from "zod"
import { getBlitzContext } from "@/src/app/blitz-server"
import { verifyResearcherStudyAccess } from "../[studyId]/utils/verifyResearchersStudyAccess"

export const GetStudyMetadataSchema = z.object({
  studyId: z.number().int().positive(),
})

// Core database and API function
const fetchStudyMetadata = cache(async (studyId: number, userId: number) => {
  // 1) Get latest JATOS ID from uploads
  const study = await db.study.findFirst({
    where: {
      id: studyId,
      researchers: {
        some: { userId: userId },
      },
    },
    select: {
      id: true,
      jatosStudyUploads: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { jatosStudyId: true },
      },
    },
  })

  if (!study) throw new Error("Study not found")
  const jatosStudyId = study.jatosStudyUploads[0]?.jatosStudyId ?? null
  if (!jatosStudyId) throw new Error("Study does not have JATOS ID")

  // 2) Fetch metadata from JATOS API
  return await getResultsMetadata({ studyIds: [jatosStudyId] })
})

// Server-side helper for RSCs
export const getStudyMetadataRsc = cache(async (studyId: number) => {
  const { session } = await getBlitzContext()
  const userId = session.userId

  if (!userId) throw new Error("Not authenticated")

  await verifyResearcherStudyAccess(studyId, userId)

  return fetchStudyMetadata(studyId, userId)
})

// Blitz RPC for client usage (with role check)
export default resolver.pipe(
  resolver.zod(GetStudyMetadataSchema),
  resolver.authorize("RESEARCHER"),
  async ({ studyId }) => {
    return getStudyMetadataRsc(studyId)
  }
)
