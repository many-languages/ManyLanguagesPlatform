// src/app/(app)/studies/queries/getFeedbackTemplate.ts
import { resolver } from "@blitzjs/rpc"
import db from "db"
import { z } from "zod"

const GetFeedbackTemplate = z.object({
  studyId: z.number(),
})

export default resolver.pipe(
  resolver.zod(GetFeedbackTemplate),
  resolver.authorize("RESEARCHER"),
  async ({ studyId }, ctx) => {
    // Get the most recent feedback template for this study
    // If you want to support multiple templates, you can return all of them
    const template = await db.feedbackTemplate.findFirst({
      where: { studyId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        content: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return template
  }
)
