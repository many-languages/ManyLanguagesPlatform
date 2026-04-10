import { resolver } from "@blitzjs/rpc"
import db from "db"
import { CreateFeedbackTemplateSchema } from "../validations"
import type { FeedbackTemplate } from "../types"
import { withStudyWriteAccess } from "../../utils/withStudyWriteAccess"
import { assertFeedbackTemplatePersonalDataPolicy } from "../utils/assertFeedbackTemplatePersonalDataPolicy"
import { createFeedbackTemplateInTransaction } from "../utils/feedbackTemplateSaveShared"

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
