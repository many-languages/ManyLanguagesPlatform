import { resolver } from "@blitzjs/rpc"
import db from "db"
import { assertStudyNotArchived } from "@/src/lib/studies"
import { UpdateJatosUploadWorkerType } from "../validations"
import { verifyResearcherStudyAccess } from "@/src/app/(app)/studies/[studyId]/utils/verifyResearchersStudyAccess"

export default resolver.pipe(
  resolver.zod(UpdateJatosUploadWorkerType),
  resolver.authorize(),
  async ({ studyId, jatosWorkerType }, ctx) => {
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

    return db.jatosStudyUpload.update({
      where: { id: latestUpload.id },
      data: { jatosWorkerType },
      select: { id: true, jatosWorkerType: true, studyId: true },
    })
  }
)
