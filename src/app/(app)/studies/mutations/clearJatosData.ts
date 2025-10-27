import { resolver } from "@blitzjs/rpc"
import db from "db"
import { z } from "zod"

const ClearJatosDataSchema = z.object({
  studyId: z.number(),
})

export default resolver.pipe(
  resolver.zod(ClearJatosDataSchema),
  resolver.authorize("RESEARCHER"),
  async ({ studyId }, ctx) => {
    // Clear JATOS fields in Study table
    await db.study.update({
      where: { id: studyId },
      data: {
        jatosWorkerType: null,
        jatosStudyId: null,
        jatosStudyUUID: null,
        jatosFileName: null,
        jatosBatchId: null,
      },
    })

    // Clear researcher run URLs (test links) from StudyResearcher table
    await db.studyResearcher.updateMany({
      where: { studyId },
      data: { jatosRunUrl: null },
    })

    return { success: true }
  }
)
