import { resolver } from "@blitzjs/rpc"
import db from "db"
import { z } from "zod"

const UpdateStudyBatchSchema = z.object({
  studyId: z.number(),
  jatosBatchId: z.number(),
})

export default resolver.pipe(
  resolver.zod(UpdateStudyBatchSchema),
  resolver.authorize(),
  async ({ studyId, jatosBatchId }) => {
    return await db.study.update({
      where: { id: studyId },
      data: { jatosBatchId },
      select: { id: true, jatosBatchId: true },
    })
  }
)
