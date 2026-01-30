import { resolver } from "@blitzjs/rpc"
import db from "db"
import { CreateFeedbackTemplateSchema } from "../validations"
import type { FeedbackTemplate } from "../types"
import { verifyResearcherStudyAccess } from "../../utils/verifyResearchersStudyAccess"

// Server-side helper for RSCs
export async function createFeedbackTemplateRsc(input: {
  studyId: number
  content: string
  requiredVariableKeys?: string[]
}): Promise<FeedbackTemplate> {
  await verifyResearcherStudyAccess(input.studyId)

  const template = await db.feedbackTemplate.create({
    data: {
      studyId: input.studyId,
      content: input.content,
      validationStatus: "NEEDS_REVIEW",
      validatedExtractionId: null,
      validatedAt: null,
      missingKeys: null,
      extraKeys: null,
      extractorVersion: null,
      requiredVariableKeys: input.requiredVariableKeys,
    },
  })

  // Mark step 6 as complete after successful creation
  const latestUpload = await db.jatosStudyUpload.findFirst({
    where: { studyId: input.studyId },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  })
  if (latestUpload) {
    await db.jatosStudyUpload.update({
      where: { id: latestUpload.id },
      data: { step6Completed: true },
    })
  }

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
