import { resolver } from "@blitzjs/rpc"
import db from "db"
import { z } from "zod"

export const saveResearcherJatosRunUrlSchema = z.object({
  studyResearcherId: z.number(),
  jatosRunUrl: z.string(),
  markerToken: z.string(),
})

export async function saveResearcherJatosRunUrl(
  studyResearcherId: number,
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

  const study = await db.study.findUnique({
    where: { id: researcher.studyId },
    select: { setupRevision: true },
  })

  if (!study) {
    throw new Error("Study not found")
  }

  return await db.pilotLink.create({
    data: {
      studyId: researcher.studyId,
      studyResearcherId: researcher.id,
      setupRevision: study.setupRevision,
      jatosRunUrl,
      markerToken,
    },
  })
}

export default resolver.pipe(
  resolver.zod(saveResearcherJatosRunUrlSchema),
  resolver.authorize("RESEARCHER"),
  async ({ studyResearcherId, jatosRunUrl, markerToken }) => {
    return await saveResearcherJatosRunUrl(studyResearcherId, jatosRunUrl, markerToken)
  }
)
