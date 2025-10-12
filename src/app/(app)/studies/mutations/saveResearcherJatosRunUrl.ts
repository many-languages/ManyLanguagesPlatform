import { resolver } from "@blitzjs/rpc"
import db from "db"
import { z } from "zod"

export const saveResearcherJatosRunUrlSchema = z.object({
  studyResearcherId: z.number(),
  jatosRunUrl: z.string(),
})

export async function saveResearcherJatosRunUrl(studyResearcherId: number, jatosRunUrl: string) {
  return await db.studyResearcher.update({
    where: { id: studyResearcherId },
    data: { jatosRunUrl },
  })
}

export default resolver.pipe(
  resolver.zod(saveResearcherJatosRunUrlSchema),
  resolver.authorize("RESEARCHER"),
  async ({ studyResearcherId, jatosRunUrl }) => {
    return await saveResearcherJatosRunUrl(studyResearcherId, jatosRunUrl)
  }
)
