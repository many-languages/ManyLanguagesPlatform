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
  missingVariableNames: string[]
  extraVariableNames: string[]
} | null> {
  const template = await tx.feedbackTemplate.findUnique({
    where: { studyId: args.studyId },
    select: { id: true, content: true },
  })

  if (!template) {
    return null
  }

  const requiredVariableNames = extractRequiredVariableNames(template.content.trim())
  const variables = await tx.studyVariable.findMany({
    where: { extractionSnapshotId: args.extractionSnapshotId },
    select: { variableKey: true, variableName: true },
  })
  const availableNames = new Set(variables.map((v) => v.variableName))
  const requiredSet = new Set(requiredVariableNames)

  const missingVariableNames = requiredVariableNames.filter((name) => !availableNames.has(name))
  const extraVariableNames = variables
    .map((v) => v.variableName)
    .filter((name) => !requiredSet.has(name))

  const status = missingVariableNames.length === 0 ? "VALID" : "INVALID"

  await tx.feedbackTemplate.update({
    where: { id: template.id },
    data: {
      validationStatus: status,
      validatedExtractionId: args.extractionSnapshotId,
      validatedAt: new Date(),
      missingVariableNames,
      extraVariableNames,
      extractorVersion: args.extractorVersion,
      requiredVariableNames,
    },
  })

  return { status, missingVariableNames, extraVariableNames }
}
