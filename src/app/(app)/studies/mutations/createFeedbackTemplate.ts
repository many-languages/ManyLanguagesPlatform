import { resolver } from "@blitzjs/rpc"
import db from "db"
import { z } from "zod"

const CreateFeedbackTemplate = z.object({
  studyId: z.number(),
  title: z.string().min(1),
  content: z.string().min(1),
})

export default resolver.pipe(
  resolver.zod(CreateFeedbackTemplate),
  resolver.authorize("RESEARCHER"), // only researchers can create
  async (input) => {
    const template = await db.feedbackTemplate.create({ data: input })
    return template
  }
)
