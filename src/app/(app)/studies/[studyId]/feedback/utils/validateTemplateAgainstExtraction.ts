import type { Prisma } from "db"
import { extractRequiredVariableNames } from "./requiredKeys"

export async function validateFeedbackTemplateAgainstExtraction(
  tx: Prisma.TransactionClient,
  args: {
    studyId: number
    extractionSnapshotId: number
    extractorVersion: string
  }
): Promise<{
  status: "VALID" | "INVALID"
  missingKeys: string[]
  extraKeys: string[]
} | null> {
  const template = await tx.feedbackTemplate.findUnique({
    where: { studyId: args.studyId },
    select: { id: true, content: true },
  })

  if (!template) {
    return null
  }

  const requiredKeys = extractRequiredVariableNames(template.content.trim())
  const variables = await tx.studyVariable.findMany({
    where: { extractionSnapshotId: args.extractionSnapshotId },
    select: { variableKey: true, variableName: true },
  })
  const availableNames = new Set(variables.map((v) => v.variableName))
  const requiredSet = new Set(requiredKeys)

  const missingKeys = requiredKeys.filter((key) => !availableNames.has(key))
  const extraKeys = variables.map((v) => v.variableName).filter((key) => !requiredSet.has(key))

  const status = missingKeys.length === 0 && extraKeys.length === 0 ? "VALID" : "INVALID"

  await tx.feedbackTemplate.update({
    where: { id: template.id },
    data: {
      validationStatus: status,
      validatedExtractionId: args.extractionSnapshotId,
      validatedAt: new Date(),
      missingKeys,
      extraKeys,
      extractorVersion: args.extractorVersion,
      requiredVariableKeys: requiredKeys,
    },
  })

  return { status, missingKeys, extraKeys }
}
