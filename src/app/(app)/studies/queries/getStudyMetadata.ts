import { getResultsMetadata } from "@/src/lib/jatos/api/getResultsMetadata"
import { resolver } from "@blitzjs/rpc"
import db from "db"
import { cache } from "react"
import { z } from "zod"
import { withStudyAccess } from "../[studyId]/utils/withStudyAccess"

export const GetStudyMetadataSchema = z.object({
  studyId: z.number().int().positive(),
})

const fetchJatosStudyId = cache(async (studyId: number, userId: number) => {
  const study = await db.study.findFirst({
    where: { id: studyId, researchers: { some: { userId } } },
    select: {
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

  return jatosStudyId
})

const fetchResultsMetadata = cache(async (jatosStudyId: number, userId: number) => {
  return await getResultsMetadata({ studyIds: [jatosStudyId] })
})

// Server-side helper for RSCs
export const getStudyMetadataRsc = async (studyId: number) => {
  return await withStudyAccess(studyId, async (sId, uId) => {
    const jatosStudyId = await fetchJatosStudyId(sId, uId)

    if (!jatosStudyId) throw new Error("Study does not have a JATOS ID")

    return await fetchResultsMetadata(jatosStudyId, uId)
  })
}

// Blitz RPC for client usage (with role check)
export default resolver.pipe(
  resolver.zod(GetStudyMetadataSchema),
  resolver.authorize("RESEARCHER"),
  async ({ studyId }) => {
    return getStudyMetadataRsc(studyId)
  }
)
