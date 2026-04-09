import { resolver } from "@blitzjs/rpc"
import db from "db"
import { UpdateFeedbackTemplateSchema } from "../validations"
import type { FeedbackTemplate } from "../types"
import { withStudyAccess } from "../../utils/withStudyAccess"
import { assertFeedbackTemplatePersonalDataPolicy } from "../utils/assertFeedbackTemplatePersonalDataPolicy"
import { updateFeedbackTemplateInTransaction } from "../utils/feedbackTemplateSaveShared"

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

  return withStudyAccess(existingTemplate.studyId, async (_sId, _uId) => {
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
