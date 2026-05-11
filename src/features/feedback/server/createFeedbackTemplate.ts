import db from "db"
import type { FeedbackTemplate } from "@/src/features/feedback/types"
import { withStudyWriteAccess } from "@/src/features/studies/services"
import { assertFeedbackTemplatePersonalDataPolicy } from "@/src/features/feedback/server/assertFeedbackTemplatePersonalDataPolicy"
import { createFeedbackTemplateInTransaction } from "@/src/features/feedback/server/feedbackTemplateSaveShared"

export async function createFeedbackTemplateRsc(input: {
  studyId: number
  content: string
  requiredVariableNames?: string[]
}): Promise<FeedbackTemplate> {
  return withStudyWriteAccess(input.studyId, async (_sId, _uId) => {
    await assertFeedbackTemplatePersonalDataPolicy(
      input.studyId,
      input.content,
      input.requiredVariableNames
    )

    return db.$transaction((tx) => createFeedbackTemplateInTransaction(tx, input))
  })
}
