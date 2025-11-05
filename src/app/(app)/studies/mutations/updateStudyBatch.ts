import { resolver } from "@blitzjs/rpc"
import db from "db"
import { UpdateStudyBatch } from "../validations"

export default resolver.pipe(
  resolver.zod(UpdateStudyBatch),
  resolver.authorize(),
  async ({ studyId, jatosBatchId }) => {
    return await db.study.update({
      where: { id: studyId },
      data: { jatosBatchId },
      select: { id: true, jatosBatchId: true },
    })
  }
)
