import type { EnrichedJatosStudyResult } from "@/src/types/jatos"
import type { StoredFeedbackPreviewContext } from "@/src/lib/feedback/previewContextStore"
import { extractRequiredVariableNames } from "@/src/lib/feedback/requiredVariableNames"
import { resolveVariableKeysForExtractionSnapshot } from "./resolveVariableKeysForFeedback"

export type PrepareFeedbackPreviewRenderInputsResult =
  | { kind: "error"; error: string }
  | { kind: "passthrough"; markdown: string }
  | {
      kind: "render"
      templateContent: string
      effectiveVariableNames: string[]
      variableKeysAllowlist: string[]
      primary: EnrichedJatosStudyResult
      cohortEnrichedResults: EnrichedJatosStudyResult[]
    }

/**
 * Preview source adapter: allowlist + key resolution + primary pilot selection.
 * No session/auth — caller validates `contextKey` and study/user match first.
 */
export async function prepareFeedbackPreviewRenderInputs(
  ctx: StoredFeedbackPreviewContext,
  input: { templateContent: string; withinStudyResultId?: number }
): Promise<PrepareFeedbackPreviewRenderInputsResult> {
  const allowedSet = new Set(ctx.allowedVariableNames)
  const requiredFromTemplate = extractRequiredVariableNames(input.templateContent)
  const disallowed = requiredFromTemplate.filter((n) => !allowedSet.has(n))
  if (disallowed.length > 0) {
    return {
      kind: "error",
      error: `Preview cannot reference: ${disallowed.join(
        ", "
      )}. Remove or replace these variables.`,
    }
  }

  const effectiveVariableNames = requiredFromTemplate.filter((n) => allowedSet.has(n))

  if (ctx.allPilotResults.length === 0) {
    return { kind: "passthrough", markdown: input.templateContent }
  }

  const variableKeysAllowlist =
    effectiveVariableNames.length > 0 && ctx.approvedExtractionId
      ? await resolveVariableKeysForExtractionSnapshot(
          ctx.approvedExtractionId,
          effectiveVariableNames
        )
      : []

  let primary = ctx.allPilotResults[0]!
  if (input.withinStudyResultId !== undefined) {
    const found = ctx.allPilotResults.find((r) => r.id === input.withinStudyResultId)
    if (found) primary = found
  }

  return {
    kind: "render",
    templateContent: input.templateContent,
    effectiveVariableNames,
    variableKeysAllowlist,
    primary,
    cohortEnrichedResults: ctx.allPilotResults,
  }
}
