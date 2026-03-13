import { resolver } from "@blitzjs/rpc"
import db, { Prisma } from "db"
import { UpdateFeedbackTemplateSchema } from "../validations"
import type { FeedbackTemplate } from "../types"
import { withStudyAccess } from "../../utils/withStudyAccess"
import { validateFeedbackTemplateAgainstExtraction } from "../utils/validateTemplateAgainstExtraction"
import { EXTRACTOR_VERSION } from "../../setup/utils/extractionCache"

// Server-side helper for RSCs
export async function updateFeedbackTemplateRsc(input: {
  id: number
  content: string
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
  return withStudyAccess(existingTemplate.studyId, async (_sId, _uId) => {
    const template = await db.$transaction(async (tx) => {
      await tx.feedbackTemplate.update({
        where: { id: input.id },
        data: {
          content: input.content,
          validationStatus: "NEEDS_REVIEW",
          validatedExtractionId: null,
          validatedAt: null,
          missingKeys: Prisma.DbNull,
          extraKeys: Prisma.DbNull,
          extractorVersion: null,
          requiredVariableKeys: input.requiredVariableKeys,
        },
      })

      const latestUpload = await tx.jatosStudyUpload.findFirst({
        where: { studyId: existingTemplate.studyId },
        orderBy: { createdAt: "desc" },
        select: { id: true, approvedExtractionId: true },
      })

      let step6Completed = true
      if (latestUpload?.approvedExtractionId) {
        const feedbackValidation = await validateFeedbackTemplateAgainstExtraction(tx, {
          studyId: existingTemplate.studyId,
          extractionSnapshotId: latestUpload.approvedExtractionId,
          extractorVersion: EXTRACTOR_VERSION,
        })
        step6Completed = feedbackValidation?.status !== "INVALID"
      }

      if (latestUpload) {
        await tx.jatosStudyUpload.update({
          where: { id: latestUpload.id },
          data: { step6Completed },
        })
      }

      return tx.feedbackTemplate.findUniqueOrThrow({
        where: { id: input.id },
      })
    })

    return template as FeedbackTemplate
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
