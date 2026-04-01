import db from "db"
import { extractRequiredVariableNames } from "./requiredKeys"

/**
 * Maps variable **names** to `StudyVariable.variableKey` for one extraction snapshot.
 * Shared by persisted-template resolution and live preview (after each path decides which names apply).
 */
export async function resolveVariableKeysForExtractionSnapshot(
  extractionSnapshotId: number,
  variableNames: string[]
): Promise<string[]> {
  if (variableNames.length === 0) return []

  const variables = await db.studyVariable.findMany({
    where: {
      extractionSnapshotId,
      variableName: { in: variableNames },
    },
    select: { variableKey: true },
  })

  return variables.map((v) => v.variableKey)
}

/**
 * Maps template `variableName` references to `StudyVariable.variableKey` for an extraction snapshot.
 * Uses explicit `requiredVariableNames` when present, otherwise parses names from template content.
 * Delegates to {@link resolveVariableKeysForExtractionSnapshot}.
 */
export async function resolveVariableKeysForFeedback(template: {
  content: string
  extractionSnapshotId?: number | null
  requiredVariableNames?: string[] | null
}): Promise<string[]> {
  if (!template.extractionSnapshotId) return []

  const requiredVariableNames =
    Array.isArray(template.requiredVariableNames) && template.requiredVariableNames.length > 0
      ? template.requiredVariableNames
      : extractRequiredVariableNames(template.content)

  return resolveVariableKeysForExtractionSnapshot(
    template.extractionSnapshotId,
    requiredVariableNames
  )
}
