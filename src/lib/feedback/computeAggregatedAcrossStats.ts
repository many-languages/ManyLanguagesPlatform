import type { EnrichedJatosStudyResult } from "@/src/types/jatos"
import { buildFeedbackRenderContext } from "./feedbackRenderContext"
import type { FeedbackRenderContext } from "./types"
import { createFeedbackStatPlaceholderRegex } from "./feedbackStatPlaceholder"
import { formatFeedbackStatMetric } from "./formatFeedbackStatMetric"
import { extractVariableBundleForRenderFromResults } from "./extractVariableBundleForRender"
import { extractRequiredVariableNames } from "./requiredVariableNames"
import { statAcrossLookupKey } from "./statAcrossKeys"
import { collectVariableValuesAcrossAllRows } from "./variableRowAggregation"

/**
 * Precompute `stat:...:across` values from a cohort of enriched results (template-driven).
 */
export function computeAggregatedAcrossStatsForTemplate(
  allEnrichedResults: EnrichedJatosStudyResult[],
  templateContent: string,
  variableKeysAllowlist?: string[]
): Record<string, string> {
  const out: Record<string, string> = {}
  if (allEnrichedResults.length === 0) return out

  const allowlist =
    variableKeysAllowlist && variableKeysAllowlist.length > 0
      ? new Set(variableKeysAllowlist)
      : undefined

  const requiredVariableNames = extractRequiredVariableNames(templateContent)
  const bundle = extractVariableBundleForRenderFromResults(allEnrichedResults, allowlist)
  const ctx: FeedbackRenderContext = buildFeedbackRenderContext(bundle, requiredVariableNames)

  const statRe = createFeedbackStatPlaceholderRegex()
  let match: RegExpExecArray | null
  while ((match = statRe.exec(templateContent)) !== null) {
    const varName = match[1]!
    const metric = match[2]!
    const scope = match[3]
    const whereClause = match[4]
    if (scope !== "across") continue

    const key = statAcrossLookupKey(varName, metric, whereClause)
    if (out[key] !== undefined) continue

    const values = collectVariableValuesAcrossAllRows(ctx, varName, whereClause)
    out[key] = formatFeedbackStatMetric(metric, values)
  }

  return out
}
