import { resolver } from "@blitzjs/rpc"
import db from "db"
import { UpdateStudyBatch } from "../validations"

export default resolver.pipe(
  resolver.zod(UpdateStudyBatch),
  resolver.authorize(),
  async ({ studyId, jatosBatchId }) => {
    const latestUpload = await db.jatosStudyUpload.findFirst({
      where: { studyId },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    })

    if (!latestUpload) {
      throw new Error("No JATOS upload found for this study")
    }

    return await db.jatosStudyUpload.update({
      where: { id: latestUpload.id },
      data: { jatosBatchId },
      select: { id: true, jatosBatchId: true, studyId: true },
    })
  }
)
