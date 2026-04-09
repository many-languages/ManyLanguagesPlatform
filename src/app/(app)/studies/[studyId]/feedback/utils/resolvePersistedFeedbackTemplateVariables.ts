import db from "db"
import type { FeedbackTemplateRscRow } from "../feedbackTemplateRscSelect"
import { parseRequiredVariableNamesFromDb } from "./parseRequiredVariableNamesFromDb"
import { resolveVariableKeysForFeedback } from "./resolveVariableKeysForFeedback"

/** Parsed DB `requiredVariableNames` JSON + `variableKey` allowlist for a saved template row. */
export type PersistedFeedbackTemplateVariables = {
  /** Result of `parseRequiredVariableNamesFromDb` — `null` if the JSON column is invalid. */
  requiredVariableNames: string[] | null
  /** `StudyVariable.variableKey` values for the latest approved extraction; empty if none. */
  variableKeysAllowlist: string[]
}

/**
 * For a persisted feedback template: normalize `requiredVariableNames` from the DB, then
 * resolve against the latest approved extraction snapshot.
 */
export async function resolvePersistedFeedbackTemplateVariables(
  template: FeedbackTemplateRscRow,
  studyId: number
): Promise<PersistedFeedbackTemplateVariables> {
  const latestUpload = await db.jatosStudyUpload.findFirst({
    where: { studyId },
    orderBy: { createdAt: "desc" },
    select: { approvedExtractionId: true },
  })

  const requiredVariableNames = parseRequiredVariableNamesFromDb(template.requiredVariableNames)
  const variableKeysAllowlist = await resolveVariableKeysForFeedback({
    content: template.content,
    extractionSnapshotId: latestUpload?.approvedExtractionId ?? null,
    requiredVariableNames: requiredVariableNames ?? undefined,
  })
  return { requiredVariableNames, variableKeysAllowlist }
}
