import db from "db"
import { extractRequiredVariableNames } from "./requiredKeys"

export async function resolveRequiredVariableKeys(template: {
  content: string
  validatedExtractionId?: number | null
  requiredVariableKeys?: string[] | null
}): Promise<string[]> {
  if (!template.validatedExtractionId) return []

  const requiredVariableNames =
    Array.isArray(template.requiredVariableKeys) && template.requiredVariableKeys.length > 0
      ? template.requiredVariableKeys
      : extractRequiredVariableNames(template.content)

  if (requiredVariableNames.length === 0) return []

  const variables = await db.studyVariable.findMany({
    where: {
      extractionSnapshotId: template.validatedExtractionId,
      variableName: { in: requiredVariableNames },
    },
    select: { variableKey: true },
  })

  return variables.map((v) => v.variableKey)
}
