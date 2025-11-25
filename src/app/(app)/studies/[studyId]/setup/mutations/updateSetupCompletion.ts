import { resolver } from "@blitzjs/rpc"
import db from "db"
import { z } from "zod"

const UpdateSetupCompletion = z.object({
  studyId: z.number(),
  step1Completed: z.boolean().optional(),
  step2Completed: z.boolean().optional(),
  step3Completed: z.boolean().optional(),
  step4Completed: z.boolean().optional(),
  step5Completed: z.boolean().optional(),
})

export default resolver.pipe(
  resolver.zod(UpdateSetupCompletion),
  resolver.authorize("RESEARCHER"),
  async (input, ctx) => {
    const { studyId, ...completionFlags } = input

    // Authorization check - ensure user is a researcher on this study
    const researcher = await db.studyResearcher.findFirst({
      where: { studyId, userId: ctx.session.userId! },
    })

    if (!researcher) {
      throw new Error("You are not authorized to modify this study.")
    }

    // Build update data object with only provided flags
    const updateData: {
      step1Completed?: boolean
      step2Completed?: boolean
      step3Completed?: boolean
      step4Completed?: boolean
      step5Completed?: boolean
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

    // Update study with completion flags
    const study = await db.study.update({
      where: { id: studyId },
      data: updateData,
      select: {
        step1Completed: true,
        step2Completed: true,
        step3Completed: true,
        step4Completed: true,
        step5Completed: true,
      },
    })

    return study
  }
)
