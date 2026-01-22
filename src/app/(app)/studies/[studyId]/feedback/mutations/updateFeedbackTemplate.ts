import { resolver } from "@blitzjs/rpc"
import db from "db"
import { UpdateFeedbackTemplateSchema } from "../validations"
import type { FeedbackTemplate } from "../types"
import { verifyResearcherStudyAccess } from "../../utils/verifyResearchersStudyAccess"

// Server-side helper for RSCs
export async function updateFeedbackTemplateRsc(input: {
  id: number
  content: string
  setupRevision: number
  extractionSnapshotId: number
  extractorVersion: string
  requiredVariableKeys?: string[]
}): Promise<FeedbackTemplate> {
  // Get the template to check studyId
  const existingTemplate = await db.feedbackTemplate.findUnique({
    where: { id: input.id },
    select: { studyId: true },
  })

  if (!existingTemplate) {
    throw new Error("Feedback template not found")
  }

  // Verify the user is a researcher on this study
  await verifyResearcherStudyAccess(existingTemplate.studyId)

  const template = await db.feedbackTemplate.update({
    where: { id: input.id },
    data: {
      content: input.content,
      setupRevision: input.setupRevision,
      extractionSnapshotId: input.extractionSnapshotId,
      extractorVersion: input.extractorVersion,
      requiredVariableKeys: input.requiredVariableKeys,
    },
    select: {
      id: true,
      studyId: true,
      content: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  // Mark step 6 as complete after successful update
  await db.study.update({
    where: { id: template.studyId },
    data: { step6Completed: true },
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
