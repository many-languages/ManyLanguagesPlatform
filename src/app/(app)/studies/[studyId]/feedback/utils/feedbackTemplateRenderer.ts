import type { FeedbackRenderContext, Primitive } from "@/src/lib/feedback/feedbackRenderContext"
import {
  createBareVarReferenceRegex,
  createFeedbackStatPlaceholderRegex,
  createIfBlockNoElseRegex,
  createIfBlockWithElseRegex,
  createVarPlaceholderRegex,
} from "@/src/lib/feedback/feedbackDslPatterns"
import { formatFeedbackStatMetric } from "@/src/lib/feedback/formatFeedbackStatMetric"
import { statAcrossLookupKey } from "@/src/lib/feedback/statAcrossKeys"
import {
  buildPredicate,
  collectVariableValuesAcrossAllRows,
} from "@/src/lib/feedback/variableRowAggregation"

export interface RenderTemplateOptions {
  withinStudyResultId?: number
  /** Precomputed `stat:...:across` values (static feedback); keyed by `statAcrossLookupKey` */
  aggregatedAcrossStats?: Record<string, string>
}

function hasMultipleStudyResultsInContext(ctx: FeedbackRenderContext): boolean {
  const ids = new Set<number>()
  for (const rowGroupKey of Object.keys(ctx.rows)) {
    const scopeKeyId = rowGroupKey.split("::")[0] ?? ""
    const studyResultIdMatch = scopeKeyId.match(/studyResultId:(\d+)/)
    if (studyResultIdMatch) {
      ids.add(Number(studyResultIdMatch[1]))
    }
  }
  return ids.size > 1
}

export function renderTemplateWithContext(
  template: string,
  ctx: FeedbackRenderContext,
  options?: RenderTemplateOptions
): string {
  let out = template

  const ifBlockRegex = createIfBlockWithElseRegex()
  const ifBlockNoElseRegex = createIfBlockNoElseRegex()

  out = out.replace(ifBlockRegex, (_m, expr: string, thenPart: string, elsePart: string) => {
    const ok = evalExprWithContext(expr, ctx, options)
    return ok ? thenPart : elsePart
  })
  out = out.replace(ifBlockNoElseRegex, (_m, expr: string, thenPart: string) => {
    const ok = evalExprWithContext(expr, ctx, options)
    return ok ? thenPart : ""
  })

  out = out.replace(
    createVarPlaceholderRegex(),
    (_m, name: string, modifier?: string, whereClause?: string) => {
      const values = getVariableValues(ctx, name, whereClause, options)
      if (!values || values.length === 0) return ""

      switch (modifier) {
        case "first":
          return String(values[0] ?? "")
        case "last":
          return String(values[values.length - 1] ?? "")
        case undefined:
        case "all":
        default:
          return values.map((v) => String(v)).join(", ")
      }
    }
  )

  out = out.replace(
    createFeedbackStatPlaceholderRegex(),
    (_m, varName: string, metric: string, scope?: string, whereClause?: string) => {
      const isAcross = scope === "across"
      if (isAcross && options?.aggregatedAcrossStats) {
        const key = statAcrossLookupKey(varName, metric, whereClause)
        const pre = options.aggregatedAcrossStats[key]
        if (pre !== undefined) return pre
      }
      const values = isAcross
        ? collectVariableValuesAcrossAllRows(ctx, varName, whereClause)
        : getVariableValues(ctx, varName, whereClause, options)
      return formatFeedbackStatMetric(metric, values)
    }
  )

  return out
}

function getVariableValues(
  ctx: FeedbackRenderContext,
  variableName: string,
  whereClause?: string,
  options?: RenderTemplateOptions
): Primitive[] {
  const withinStudyResultId = options?.withinStudyResultId
  const multi = hasMultipleStudyResultsInContext(ctx)
  if (multi && withinStudyResultId === undefined) {
    throw new Error(
      "Feedback render: withinStudyResultId is required when the context contains multiple study results."
    )
  }
  const values = ctx.vars[variableName] ?? []
  if (!whereClause && !withinStudyResultId && !multi) {
    return values
  }
  const pred = whereClause ? buildPredicate(whereClause) : undefined
  const filtered: Primitive[] = []
  for (const [rowGroupKey, row] of Object.entries(ctx.rows)) {
    if (
      withinStudyResultId !== undefined &&
      !rowMatchesStudyResultId(rowGroupKey, withinStudyResultId)
    ) {
      continue
    }
    if (pred && !pred(row)) continue
    if (row[variableName] !== undefined) {
      filtered.push(row[variableName] ?? null)
    }
  }
  return filtered
}

function evalExprWithContext(
  expr: string,
  ctx: FeedbackRenderContext,
  options?: RenderTemplateOptions
): boolean {
  let e = expr.replace(createBareVarReferenceRegex(), (_m, name: string, modifier?: string) => {
    const values = getVariableValues(ctx, name, undefined, options)
    if (values.length === 0) return "null"

    let value: Primitive
    switch (modifier) {
      case "first":
        value = values[0]
        break
      case "last":
        value = values[values.length - 1]
        break
      case undefined:
      case "all":
      default:
        value = values[0]
        break
    }

    if (typeof value === "number" || typeof value === "boolean") return String(value)
    if (value === null || value === undefined) return "null"
    return JSON.stringify(String(value))
  })
  e = e
    .replace(/\band\b/g, "&&")
    .replace(/\bor\b/g, "||")
    .replace(/\bnot\b/g, "!")
  if (/[^\w\s\d\+\-\*\/%<>=!&|\(\)\.'",]/.test(e)) return false
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function(`return (${e});`)
    return Boolean(fn())
  } catch {
    return false
  }
}

function rowMatchesStudyResultId(rowGroupKey: string, studyResultId: number): boolean {
  const scopeKeyId = rowGroupKey.split("::")[0] ?? ""
  if (!scopeKeyId.includes("studyResultId:")) return true
  const pattern = new RegExp(`(?:^|\\|)studyResultId:${studyResultId}(?:\\||$)`)
  return pattern.test(scopeKeyId)
}
