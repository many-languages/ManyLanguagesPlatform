import { resolver } from "@blitzjs/rpc"
import db from "db"
import { z } from "zod"
import { verifyResearcherStudyAccess } from "../../utils/verifyResearchersStudyAccess"

const UpdateSetupCompletion = z.object({
  studyId: z.number(),
  step1Completed: z.boolean().optional(),
  step2Completed: z.boolean().optional(),
  step3Completed: z.boolean().optional(),
  step4Completed: z.boolean().optional(),
  step5Completed: z.boolean().optional(),
  step6Completed: z.boolean().optional(),
})

export default resolver.pipe(
  resolver.zod(UpdateSetupCompletion),
  resolver.authorize("RESEARCHER"),
  async (input, ctx) => {
    const { studyId, ...completionFlags } = input

    // Authorization check - ensure user is a researcher on this study
    await verifyResearcherStudyAccess(studyId)

    // Build update data object with only provided flags
    const updateData: {
      step1Completed?: boolean
      step2Completed?: boolean
      step3Completed?: boolean
      step4Completed?: boolean
      step5Completed?: boolean
      step6Completed?: boolean
    } = {}

    if (completionFlags.step1Completed !== undefined) {
      updateData.step1Completed = completionFlags.step1Completed
    }
    if (completionFlags.step2Completed !== undefined) {
      updateData.step2Completed = completionFlags.step2Completed
    }
    if (completionFlags.step3Completed !== undefined) {
      updateData.step3Completed = completionFlags.step3Completed
    }
    if (completionFlags.step4Completed !== undefined) {
      updateData.step4Completed = completionFlags.step4Completed
    }
    if (completionFlags.step5Completed !== undefined) {
      updateData.step5Completed = completionFlags.step5Completed
    }

    const latestUpload = await db.jatosStudyUpload.findFirst({
      where: { studyId },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    })

    if (!latestUpload) {
      throw new Error("No JATOS upload found for this study")
    }

    const upload = await db.jatosStudyUpload.update({
      where: { id: latestUpload.id },
      data: updateData,
      select: {
        step1Completed: true,
        step2Completed: true,
        step3Completed: true,
        step4Completed: true,
        step5Completed: true,
        step6Completed: true,
        studyId: true,
      },
    })

    return upload
  }
)
