import { resolver } from "@blitzjs/rpc"
import db from "db"
import { z } from "zod"

export const saveResearcherJatosRunUrlSchema = z.object({
  studyResearcherId: z.number(),
  jatosStudyUploadId: z.number(),
  jatosRunUrl: z.string(),
  markerToken: z.string(),
})

export async function saveResearcherJatosRunUrl(
  studyResearcherId: number,
  jatosStudyUploadId: number,
  jatosRunUrl: string,
  markerToken: string
) {
  const researcher = await db.studyResearcher.findUnique({
    where: { id: studyResearcherId },
    select: { id: true, studyId: true },
  })

  if (!researcher) {
    throw new Error("Researcher not found")
  }

  const upload = await db.jatosStudyUpload.findUnique({
    where: { id: jatosStudyUploadId },
    select: { id: true, studyId: true },
  })

  if (!upload || upload.studyId !== researcher.studyId) {
    throw new Error("JATOS upload not found for this study")
  }

  return await db.pilotLink.create({
    data: {
      studyResearcherId: researcher.id,
      jatosStudyUploadId: upload.id,
      jatosRunUrl,
      markerToken,
    },
  })
}

export default resolver.pipe(
  resolver.zod(saveResearcherJatosRunUrlSchema),
  resolver.authorize("RESEARCHER"),
  async ({ studyResearcherId, jatosStudyUploadId, jatosRunUrl, markerToken }) => {
    return await saveResearcherJatosRunUrl(
      studyResearcherId,
      jatosStudyUploadId,
      jatosRunUrl,
      markerToken
    )
  }
)
