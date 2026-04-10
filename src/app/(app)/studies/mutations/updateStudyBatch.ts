import { resolver } from "@blitzjs/rpc"
import db from "db"
import { assertStudyNotArchived } from "@/src/lib/studies"
import { verifyResearcherStudyAccess } from "@/src/app/(app)/studies/[studyId]/utils/verifyResearchersStudyAccess"
import { UpdateStudyBatch } from "../validations"

export default resolver.pipe(
  resolver.zod(UpdateStudyBatch),
  resolver.authorize(),
  async ({ studyId, jatosBatchId }, ctx) => {
    await verifyResearcherStudyAccess(studyId, ctx.session.userId!)
    await assertStudyNotArchived(studyId)

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
