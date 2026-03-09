import { resolver } from "@blitzjs/rpc"
import db, { Prisma } from "db"
import { CreateFeedbackTemplateSchema } from "../validations"
import type { FeedbackTemplate } from "../types"
import { verifyResearcherStudyAccess } from "../../utils/verifyResearchersStudyAccess"
import { validateFeedbackTemplateAgainstExtraction } from "../utils/validateTemplateAgainstExtraction"
import { EXTRACTOR_VERSION } from "../../setup/utils/extractionCache"

// Server-side helper for RSCs
export async function createFeedbackTemplateRsc(input: {
  studyId: number
  content: string
  requiredVariableKeys?: string[]
}): Promise<FeedbackTemplate> {
  await verifyResearcherStudyAccess(input.studyId)

  const template = await db.$transaction(async (tx) => {
    const created = await tx.feedbackTemplate.create({
      data: {
        studyId: input.studyId,
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
      where: { studyId: input.studyId },
      orderBy: { createdAt: "desc" },
      select: { id: true, approvedExtractionId: true },
    })

    let step6Completed = true
    if (latestUpload?.approvedExtractionId) {
      const feedbackValidation = await validateFeedbackTemplateAgainstExtraction(tx, {
        studyId: input.studyId,
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
      where: { id: created.id },
    })
  })

  return template as FeedbackTemplate
}

// Blitz RPC for client usage
export default resolver.pipe(
  resolver.zod(CreateFeedbackTemplateSchema),
  resolver.authorize("RESEARCHER"), // only researchers can create
  async (input) => {
    return createFeedbackTemplateRsc(input)
  }
)
