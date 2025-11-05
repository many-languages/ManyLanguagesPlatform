import { resolver } from "@blitzjs/rpc"
import db from "db"
import { z } from "zod"

const UpdateFeedbackTemplate = z.object({
  id: z.number(),
  content: z.string().min(1),
})

export default resolver.pipe(
  resolver.zod(UpdateFeedbackTemplate),
  resolver.authorize("RESEARCHER"),
  async ({ id, ...data }) => {
    const template = await db.feedbackTemplate.update({
      where: { id },
      data,
      select: {
        id: true,
        studyId: true,
        content: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    // Mark step 4 as complete after successful update
    await db.study.update({
      where: { id: template.studyId },
      data: { step4Completed: true },
    })

    return template
  }
)
