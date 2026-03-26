import type { FeedbackTemplateRscRow } from "../feedbackTemplateRscSelect"
import { parseRequiredVariableNamesFromDb } from "./parseRequiredVariableNamesFromDb"
import { resolveVariableKeysForFeedback } from "./resolveVariableKeysForFeedback"

/** Parsed DB `requiredVariableNames` JSON + `variableKey` allowlist for a saved template row. */
export type PersistedFeedbackTemplateVariables = {
  /** Result of `parseRequiredVariableNamesFromDb` — `null` if the JSON column is invalid. */
  requiredVariableNames: string[] | null
  /** `StudyVariable.variableKey` values for the validated extraction; empty if none. */
  variableKeysAllowlist: string[]
}

/**
 * For a persisted feedback template: normalize `requiredVariableNames` from the DB, then
 * `resolveVariableKeysForFeedback` (delegates to `resolveVariableKeysForExtractionSnapshot`).
 */
export async function resolvePersistedFeedbackTemplateVariables(
  template: FeedbackTemplateRscRow
): Promise<PersistedFeedbackTemplateVariables> {
  const requiredVariableNames = parseRequiredVariableNamesFromDb(template.requiredVariableNames)
  const variableKeysAllowlist = await resolveVariableKeysForFeedback({
    content: template.content,
    validatedExtractionId: template.validatedExtractionId,
    requiredVariableNames: requiredVariableNames ?? undefined,
  })
  return { requiredVariableNames, variableKeysAllowlist }
}
