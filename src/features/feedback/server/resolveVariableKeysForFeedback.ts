import db from "db"
import { extractRequiredVariableNames } from "@/src/features/feedback/domain/requiredVariableNames"

/**
 * Maps DSL token identifiers to `StudyVariable.variableKey` for one extraction snapshot.
 * Shared by persisted-template resolution and live preview (after each path decides which tokens apply).
 */
export async function resolveVariableKeysForExtractionSnapshot(
  extractionSnapshotId: number,
  dslKeys: string[]
): Promise<string[]> {
  if (dslKeys.length === 0) return []

  const variables = await db.studyVariable.findMany({
    where: {
      extractionSnapshotId,
      dslKey: { in: dslKeys },
    },
    select: { variableKey: true },
  })

  return variables.map((v) => v.variableKey)
}

/**
 * Maps template DSL token references to `StudyVariable.variableKey` for an extraction snapshot.
 * Uses explicit `requiredVariableNames` (DSL tokens) when present, otherwise parses from template content.
 * Delegates to {@link resolveVariableKeysForExtractionSnapshot}.
 */
export async function resolveVariableKeysForFeedback(template: {
  content: string
  extractionSnapshotId?: number | null
  requiredVariableNames?: string[] | null
}): Promise<string[]> {
  if (!template.extractionSnapshotId) return []

  const requiredDslKeys =
    Array.isArray(template.requiredVariableNames) && template.requiredVariableNames.length > 0
      ? template.requiredVariableNames
      : extractRequiredVariableNames(template.content)

  return resolveVariableKeysForExtractionSnapshot(template.extractionSnapshotId, requiredDslKeys)
}
