import { resolver } from "@blitzjs/rpc"
import db from "db"
import { getBlitzContext } from "@/src/app/blitz-server"
import { CreateFeedbackTemplateSchema } from "../validations"
import type { FeedbackTemplate } from "../types"

// Server-side helper for RSCs
export async function createFeedbackTemplateRsc(input: {
  studyId: number
  content: string
}): Promise<FeedbackTemplate> {
  const { session } = await getBlitzContext()
  if (!session.userId) throw new Error("Not authenticated")

  // Verify the user is a researcher on this study
  const researcher = await db.studyResearcher.findFirst({
    where: { studyId: input.studyId, userId: session.userId },
  })

  if (!researcher) {
    throw new Error("You are not authorized to create feedback templates for this study.")
  }

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
