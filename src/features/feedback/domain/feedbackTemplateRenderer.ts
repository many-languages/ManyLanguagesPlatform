import type {
  FeedbackRenderContext,
  Primitive,
} from "@/src/features/feedback/domain/feedbackRenderContext"
import {
  createBareVarReferenceRegex,
  createBareStatReferenceRegex,
  createFeedbackStatPlaceholderRegex,
  createIfBlockNoElseRegex,
  createIfBlockWithElseRegex,
  createVarPlaceholderRegex,
} from "@/src/features/feedback/domain/feedbackDslPatterns"
import { formatFeedbackStatMetric } from "@/src/features/feedback/domain/formatFeedbackStatMetric"
import { statAcrossLookupKey } from "@/src/features/feedback/domain/statAcrossKeys"
import {
  buildPredicate,
  collectVariableValuesAcrossAllRows,
} from "@/src/features/feedback/domain/variableRowAggregation"

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
  let e = expr.replace(
    createBareStatReferenceRegex(),
    (_m, name: string, metric: string, whereClause?: string) => {
      const values = getVariableValues(ctx, name, whereClause, options)
      const rendered = formatFeedbackStatMetric(metric, values)
      return rendered === "" ? "null" : rendered
    }
  )

  e = e.replace(createBareVarReferenceRegex(), (_m, name: string, modifier?: string) => {
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
  return evaluateConditionExpression(e)
}

type ConditionToken =
  | { type: "literal"; value: Primitive }
  | { type: "operator"; value: ConditionOperator }
  | { type: "paren"; value: "(" | ")" }

type ConditionOperator = "==" | "!=" | ">=" | "<=" | ">" | "<" | "and" | "or" | "not"

function evaluateConditionExpression(expr: string): boolean {
  const tokens = tokenizeConditionExpression(expr)
  if (!tokens) return false

  let cursor = 0

  const peek = () => tokens[cursor]
  const consume = () => tokens[cursor++]
  const matchOperator = (...operators: ConditionOperator[]) => {
    const token = peek()
    if (token?.type !== "operator" || !operators.includes(token.value)) return false
    cursor += 1
    return true
  }

  const parseExpression = (): unknown => parseOr()

  const parseOr = (): unknown => {
    let left = parseAnd()
    while (matchOperator("or")) {
      const right = parseAnd()
      left = Boolean(left) || Boolean(right)
    }
    return left
  }

  const parseAnd = (): unknown => {
    let left = parseUnary()
    while (matchOperator("and")) {
      const right = parseUnary()
      left = Boolean(left) && Boolean(right)
    }
    return left
  }

  const parseUnary = (): unknown => {
    if (matchOperator("not")) {
      return !Boolean(parseUnary())
    }
    return parseComparison()
  }

  const parseComparison = (): unknown => {
    const left = parsePrimary()
    const token = peek()
    if (token?.type !== "operator" || !["==", "!=", ">=", "<=", ">", "<"].includes(token.value)) {
      return left
    }
    const operator = consume()
    const right = parsePrimary()
    return compareConditionValues(left, operator.value, right)
  }

  const parsePrimary = (): unknown => {
    const token = consume()
    if (!token) throw new Error("Unexpected end of expression")
    if (token.type === "literal") return token.value
    if (token.type === "paren" && token.value === "(") {
      const value = parseExpression()
      const close = consume()
      if (close?.type !== "paren" || close.value !== ")") {
        throw new Error("Unclosed parenthesis")
      }
      return value
    }
    throw new Error("Expected literal or parenthesized expression")
  }

  try {
    const result = parseExpression()
    return cursor === tokens.length ? Boolean(result) : false
  } catch {
    return false
  }
}

function tokenizeConditionExpression(expr: string): ConditionToken[] | null {
  const tokens: ConditionToken[] = []
  let i = 0

  while (i < expr.length) {
    const ch = expr[i]
    if (/\s/.test(ch)) {
      i += 1
      continue
    }

    const two = expr.slice(i, i + 2)
    if (["==", "!=", ">=", "<=", "&&", "||"].includes(two)) {
      tokens.push({
        type: "operator",
        value: two === "&&" ? "and" : two === "||" ? "or" : (two as ConditionOperator),
      })
      i += 2
      continue
    }

    if (ch === ">" || ch === "<" || ch === "!") {
      tokens.push({ type: "operator", value: ch === "!" ? "not" : (ch as ">" | "<") })
      i += 1
      continue
    }

    if (ch === "(" || ch === ")") {
      tokens.push({ type: "paren", value: ch })
      i += 1
      continue
    }

    if (ch === '"' || ch === "'") {
      const parsed = readQuotedString(expr, i)
      if (!parsed) return null
      tokens.push({ type: "literal", value: parsed.value })
      i = parsed.end
      continue
    }

    const numberMatch = expr.slice(i).match(/^-?\d+(?:\.\d+)?/)
    if (numberMatch) {
      tokens.push({ type: "literal", value: Number(numberMatch[0]) })
      i += numberMatch[0].length
      continue
    }

    const wordMatch = expr.slice(i).match(/^[a-zA-Z_][a-zA-Z0-9_]*/)
    if (wordMatch) {
      const word = wordMatch[0]
      const normalized = word.toLowerCase()
      if (normalized === "true" || normalized === "false") {
        tokens.push({ type: "literal", value: normalized === "true" })
      } else if (normalized === "null") {
        tokens.push({ type: "literal", value: null })
      } else if (normalized === "and" || normalized === "or" || normalized === "not") {
        tokens.push({ type: "operator", value: normalized })
      } else {
        return null
      }
      i += word.length
      continue
    }

    return null
  }

  return tokens
}

function readQuotedString(input: string, start: number): { value: string; end: number } | null {
  const quote = input[start]
  let value = ""
  for (let i = start + 1; i < input.length; i++) {
    const ch = input[i]
    if (ch === "\\") {
      const next = input[i + 1]
      if (next === undefined) return null
      value += next
      i += 1
      continue
    }
    if (ch === quote) {
      return { value, end: i + 1 }
    }
    value += ch
  }
  return null
}

function compareConditionValues(lhs: unknown, op: string, rhs: unknown): boolean {
  switch (op) {
    case "==":
      return lhs === rhs
    case "!=":
      return lhs !== rhs
    case ">":
      return Number(lhs) > Number(rhs)
    case "<":
      return Number(lhs) < Number(rhs)
    case ">=":
      return Number(lhs) >= Number(rhs)
    case "<=":
      return Number(lhs) <= Number(rhs)
    default:
      return false
  }
}

function rowMatchesStudyResultId(rowGroupKey: string, studyResultId: number): boolean {
  const scopeKeyId = rowGroupKey.split("::")[0] ?? ""
  if (!scopeKeyId.includes("studyResultId:")) return true
  const pattern = new RegExp(`(?:^|\\|)studyResultId:${studyResultId}(?:\\||$)`)
  return pattern.test(scopeKeyId)
}
