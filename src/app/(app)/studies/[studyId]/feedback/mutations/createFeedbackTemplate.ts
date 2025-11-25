import { resolver } from "@blitzjs/rpc"
import db from "db"
import { CreateFeedbackTemplateSchema } from "../validations"
import type { FeedbackTemplate } from "../types"
import { verifyResearcherStudyAccess } from "../../utils/verifyResearchersStudyAccess"

// Server-side helper for RSCs
export async function createFeedbackTemplateRsc(input: {
  studyId: number
  content: string
}): Promise<FeedbackTemplate> {
  await verifyResearcherStudyAccess(input.studyId)

  const template = await db.feedbackTemplate.create({ data: input })

  // Mark step 5 as complete after successful creation
  await db.study.update({
    where: { id: input.studyId },
    data: { step5Completed: true },
  })

  return template
}

// Blitz RPC for client usage
export default resolver.pipe(
  resolver.zod(CreateFeedbackTemplateSchema),
  resolver.authorize("RESEARCHER"), // only researchers can create
  async (input) => {
    return createFeedbackTemplateRsc(input)
  }
)
