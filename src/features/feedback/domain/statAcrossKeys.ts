import { createFeedbackStatPlaceholderRegex } from "./feedbackStatPlaceholder"

/** Stable key for precomputed stat:...:across values (must match renderer + aggregation). */
export function statAcrossLookupKey(varName: string, metric: string, whereClause?: string): string {
  const w = (whereClause ?? "").replace(/\s+/g, " ").trim()
  return `${varName}|${metric}|${w}`
}

/**
 * True if the template contains at least one well-formed `{{ stat:…:across }}` placeholder.
 * Uses the same regex as rendering/aggregation (`createFeedbackStatPlaceholderRegex`) so
 * detection matches parsing (JATOS fetch policy, `prepareFeedbackRenderInputsFromEnrichedResults`, editor warning).
 */
export function templateUsesStatAcross(templateContent: string): boolean {
  const re = createFeedbackStatPlaceholderRegex()
  let m: RegExpExecArray | null
  while ((m = re.exec(templateContent)) !== null) {
    if (m[3] === "across") {
      return true
    }
  }
  return false
}
