import { Prisma } from "db"
import type { FeedbackTemplate } from "../types"
import { EXTRACTOR_VERSION } from "../../setup/utils/extractionCache"
import { validateFeedbackTemplateAgainstExtraction } from "./validateTemplateAgainstExtraction"

/** Fields reset whenever template content (or required variables) change and must be re-validated. */
export const feedbackTemplateValidationResetFields = {
  validationStatus: "NEEDS_REVIEW" as const,
  validatedExtractionId: null,
  validatedAt: null,
  missingVariableNames: Prisma.DbNull,
  extraVariableNames: Prisma.DbNull,
  extractorVersion: null,
}

/**
 * After creating or updating feedback template content: re-run extraction validation for the
 * latest approved upload, sync `step6Completed` on that upload, return the full template row.
 */
export async function finalizeFeedbackTemplateAfterContentChange(
  tx: Prisma.TransactionClient,
  studyId: number,
  templateId: number
): Promise<FeedbackTemplate> {
  const latestUpload = await tx.jatosStudyUpload.findFirst({
    where: { studyId },
    orderBy: { createdAt: "desc" },
    select: { id: true, approvedExtractionId: true },
  })

  let step6Completed = true
  if (latestUpload?.approvedExtractionId) {
    const feedbackValidation = await validateFeedbackTemplateAgainstExtraction(tx, {
      studyId,
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

  const row = await tx.feedbackTemplate.findUniqueOrThrow({
    where: { id: templateId },
  })
  return row as FeedbackTemplate
}

export type SaveFeedbackTemplateInTransaction = {
  studyId: number
  content: string
  requiredVariableNames?: string[]
}

/**
 * Runs the shared save pipeline inside an existing transaction (caller opens `db.$transaction`).
 */
export async function createFeedbackTemplateInTransaction(
  tx: Prisma.TransactionClient,
  input: SaveFeedbackTemplateInTransaction
): Promise<FeedbackTemplate> {
  const created = await tx.feedbackTemplate.create({
    data: {
      studyId: input.studyId,
      content: input.content,
      ...feedbackTemplateValidationResetFields,
      requiredVariableNames: input.requiredVariableNames,
    },
  })

  return finalizeFeedbackTemplateAfterContentChange(tx, input.studyId, created.id)
}

export async function updateFeedbackTemplateInTransaction(
  tx: Prisma.TransactionClient,
  input: { id: number } & SaveFeedbackTemplateInTransaction
): Promise<FeedbackTemplate> {
  await tx.feedbackTemplate.update({
    where: { id: input.id },
    data: {
      content: input.content,
      ...feedbackTemplateValidationResetFields,
      requiredVariableNames: input.requiredVariableNames,
    },
  })

  return finalizeFeedbackTemplateAfterContentChange(tx, input.studyId, input.id)
}
