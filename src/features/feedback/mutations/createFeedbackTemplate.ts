import { resolver } from "@blitzjs/rpc"
import db from "db"
import { CreateFeedbackTemplateSchema } from "@/src/features/feedback/validations"
import type { FeedbackTemplate } from "@/src/features/feedback/types"
import { withStudyWriteAccess } from "@/src/app/(app)/studies/[studyId]/utils/withStudyWriteAccess"
import { assertFeedbackTemplatePersonalDataPolicy } from "@/src/features/feedback/server/assertFeedbackTemplatePersonalDataPolicy"
import { createFeedbackTemplateInTransaction } from "@/src/features/feedback/server/feedbackTemplateSaveShared"

// Server-side helper for RSCs
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

// Blitz RPC for client usage
export default resolver.pipe(
  resolver.zod(CreateFeedbackTemplateSchema),
  resolver.authorize("RESEARCHER"), // only researchers can create
  async (input) => {
    return createFeedbackTemplateRsc(input)
  }
)
