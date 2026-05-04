import { resolver } from "@blitzjs/rpc"
import db from "db"
import { UpdateFeedbackTemplateSchema } from "@/src/features/feedback/validations"
import type { FeedbackTemplate } from "@/src/features/feedback/types"
import { withStudyWriteAccess } from "@/src/features/studies/server/withStudyWriteAccess"
import { assertFeedbackTemplatePersonalDataPolicy } from "@/src/features/feedback/server/assertFeedbackTemplatePersonalDataPolicy"
import { updateFeedbackTemplateInTransaction } from "@/src/features/feedback/server/feedbackTemplateSaveShared"

// Server-side helper for RSCs
export async function updateFeedbackTemplateRsc(input: {
  id: number
  content: string
  requiredVariableNames?: string[]
}): Promise<FeedbackTemplate> {
  const existingTemplate = await db.feedbackTemplate.findUnique({
    where: { id: input.id },
    select: { studyId: true },
  })

  if (!existingTemplate) {
    throw new Error("Feedback template not found")
  }

  return withStudyWriteAccess(existingTemplate.studyId, async (_sId, _uId) => {
    await assertFeedbackTemplatePersonalDataPolicy(
      existingTemplate.studyId,
      input.content,
      input.requiredVariableNames
    )

    return db.$transaction((tx) =>
      updateFeedbackTemplateInTransaction(tx, {
        id: input.id,
        studyId: existingTemplate.studyId,
        content: input.content,
        requiredVariableNames: input.requiredVariableNames,
      })
    )
  })
}

// Blitz RPC for client usage
export default resolver.pipe(
  resolver.zod(UpdateFeedbackTemplateSchema),
  resolver.authorize("RESEARCHER"),
  async ({ id, ...data }) => {
    return updateFeedbackTemplateRsc({ id, ...data })
  }
)
