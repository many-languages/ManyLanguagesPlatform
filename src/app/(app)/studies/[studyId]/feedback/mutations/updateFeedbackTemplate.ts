import { resolver } from "@blitzjs/rpc"
import db from "db"
import { getBlitzContext } from "@/src/app/blitz-server"
import { UpdateFeedbackTemplateSchema } from "../validations"
import type { FeedbackTemplate } from "../types"

// Server-side helper for RSCs
export async function updateFeedbackTemplateRsc(input: {
  id: number
  content: string
}): Promise<FeedbackTemplate> {
  const { session } = await getBlitzContext()
  if (!session.userId) throw new Error("Not authenticated")

  // Get the template to check studyId
  const existingTemplate = await db.feedbackTemplate.findUnique({
    where: { id: input.id },
    select: { studyId: true },
  })

  if (!existingTemplate) {
    throw new Error("Feedback template not found")
  }

  // Verify the user is a researcher on this study
  const researcher = await db.studyResearcher.findFirst({
    where: { studyId: existingTemplate.studyId, userId: session.userId },
  })

  if (!researcher) {
    throw new Error("You are not authorized to update feedback templates for this study.")
  }

  const template = await db.feedbackTemplate.update({
    where: { id: input.id },
    data: { content: input.content },
    select: {
      id: true,
      studyId: true,
      content: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  // Mark step 5 as complete after successful update
  await db.study.update({
    where: { id: template.studyId },
    data: { step5Completed: true },
  })

  return template
}

// Blitz RPC for client usage
export default resolver.pipe(
  resolver.zod(UpdateFeedbackTemplateSchema),
  resolver.authorize("RESEARCHER"),
  async ({ id, ...data }) => {
    return updateFeedbackTemplateRsc({ id, ...data })
  }
)
