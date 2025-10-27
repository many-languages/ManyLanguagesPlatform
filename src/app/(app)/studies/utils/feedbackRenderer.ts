import { EnrichedJatosStudyResult } from "@/src/types/jatos"

type Primitive = string | number | boolean | null

export interface RenderContext {
  enrichedResult: EnrichedJatosStudyResult
}

// Build a participant variable map with all values for each variable
export function buildParticipantVarMap(
  enrichedResult: EnrichedJatosStudyResult
): Record<string, Primitive[]> {
  const vars: Record<string, Primitive[]> = {}

  for (const comp of enrichedResult.componentResults) {
    const data = comp.parsedData as any
    if (!data) continue

    if (Array.isArray(data)) {
      for (const trial of data) {
        if (trial && typeof trial === "object") {
          for (const [k, v] of Object.entries(trial)) {
            if (!vars[k]) {
              vars[k] = []
            }
            vars[k].push(normalizeValue(v))
          }
        }
      }
    } else if (typeof data === "object") {
      for (const [k, v] of Object.entries(data)) {
        if (!vars[k]) {
          vars[k] = []
        }
        vars[k].push(normalizeValue(v))
      }
    }
  }

  return vars
}

function normalizeValue(v: any): Primitive {
  if (v === null || v === undefined) return null
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return v
  return JSON.stringify(v)
}

// Extract numeric series for a variable across trials
export function extractNumericSeries(
  enrichedResult: EnrichedJatosStudyResult,
  variableName: string
): number[] {
  const values: number[] = []
  for (const comp of enrichedResult.componentResults) {
    const data = comp.parsedData as any
    if (!data) continue
    if (Array.isArray(data)) {
      for (const trial of data) {
        const v = trial?.[variableName]
        const num = toNumber(v)
        if (num !== null) values.push(num)
      }
    } else if (typeof data === "object") {
      const v = (data as any)[variableName]
      const num = toNumber(v)
      if (num !== null) values.push(num)
    }
  }
  return values
}

// Extract all values (not just numeric) for counting purposes
export function extractAllValues(
  enrichedResult: EnrichedJatosStudyResult,
  variableName: string
): any[] {
  const values: any[] = []
  for (const comp of enrichedResult.componentResults) {
    const data = comp.parsedData as any
    if (!data) continue
    if (Array.isArray(data)) {
      for (const trial of data) {
        const v = trial?.[variableName]
        if (v !== undefined && v !== null) values.push(v)
      }
    } else if (typeof data === "object") {
      const v = (data as any)[variableName]
      if (v !== undefined && v !== null) values.push(v)
    }
  }
  return values
}

function toNumber(v: any): number | null {
  if (typeof v === "number") return v
  if (typeof v === "string" && v.trim() !== "" && !isNaN(Number(v))) return Number(v)
  return null
}

// Basic stats
export function mean(xs: number[]): number | null {
  if (xs.length === 0) return null
  return xs.reduce((a, b) => a + b, 0) / xs.length
}

export function median(xs: number[]): number | null {
  if (xs.length === 0) return null
  const s = [...xs].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid]
}

export function sd(xs: number[]): number | null {
  if (xs.length === 0) return null
  const m = mean(xs)!
  const v = xs.reduce((acc, x) => acc + (x - m) * (x - m), 0) / xs.length
  return Math.sqrt(v)
}

// Render template: supports {{ var:name }}, {{ stat:name.avg|median|sd|count }} and simple {{#if expr}} blocks
export function renderTemplate(template: string, ctx: RenderContext): string {
  let out = template

  // Handle conditionals (simple comparator with var: and numbers/strings)
  const ifBlockRegex = /\{\{#if\s+([^}]+)\}\}([\s\S]*?)\{\{\/?else\}\}([\s\S]*?)\{\{\/?if\}\}/g
  const ifBlockNoElseRegex = /\{\{#if\s+([^}]+)\}\}([\s\S]*?)\{\{\/?if\}\}/g

  out = out.replace(ifBlockRegex, (_, expr: string, thenPart: string, elsePart: string) => {
    const ok = evalExpr(expr, ctx)
    return ok ? thenPart : elsePart
  })
  out = out.replace(ifBlockNoElseRegex, (_, expr: string, thenPart: string) => {
    const ok = evalExpr(expr, ctx)
    return ok ? thenPart : ""
  })

  // Replace vars with modifiers and optional filters: {{ var:name:modifier | where: condition }}
  const vars = buildParticipantVarMap(ctx.enrichedResult)
  out = out.replace(
    /\{\{\s*var:([a-zA-Z0-9_\.]+)(?::([a-zA-Z0-9_]+))?(?:\s*\|\s*where:\s*([\s\S]*?))?\s*\}\}/g,
    (_, name: string, modifier?: string, whereClause?: string) => {
      const values = vars[name]
      if (!values || values.length === 0) return ""

      // Apply filter if specified
      let filteredValues = values
      if (whereClause) {
        const pred = buildPredicate(whereClause)
        // Extract filtered values based on trial context
        filteredValues = extractFilteredVariableValues(ctx.enrichedResult, name, pred)
      }

      switch (modifier) {
        case "first":
          return String(filteredValues[0] ?? "")
        case "last":
          return String(filteredValues[filteredValues.length - 1] ?? "")
        case undefined:
        case "all":
        default:
          // Default behavior: show all values comma-separated
          return filteredValues.map((v) => String(v)).join(", ")
      }
    }
  )

  // Replace stats with optional filters: {{ stat:var.metric | where: field == "val" and correct == true }}
  out = out.replace(
    /\{\{\s*stat:([a-zA-Z0-9_\.]+)\.(avg|median|sd|count)(?:\s*\|\s*where:\s*([\s\S]*?))?\s*\}\}/g,
    (_m, varName: string, metric: string, whereClause?: string) => {
      if (metric === "count") {
        // For count, we need to count all values (not just numeric)
        const pred = whereClause ? buildPredicate(whereClause) : undefined
        const allValues = extractAllValuesWithPredicate(ctx.enrichedResult, varName, pred)
        return String(allValues.length)
      } else {
        // For avg, median, sd, we need numeric values
        const pred = whereClause ? buildPredicate(whereClause) : undefined
        const series = extractNumericSeriesWithPredicate(ctx.enrichedResult, varName, pred)
        if (metric === "avg") return safeNum(mean(series))
        if (metric === "median") return safeNum(median(series))
        if (metric === "sd") return safeNum(sd(series))
      }
      return ""
    }
  )

  return out
}

function safeNum(n: number | null): string {
  return n === null ? "" : String(round(n, 2))
}

function round(n: number, d: number): number {
  const f = Math.pow(10, d)
  return Math.round(n * f) / f
}

// Extract numeric series with optional predicate over trial/object
function extractNumericSeriesWithPredicate(
  enrichedResult: EnrichedJatosStudyResult,
  variableName: string,
  pred?: (row: any) => boolean
): number[] {
  const values: number[] = []
  for (const comp of enrichedResult.componentResults) {
    const data = comp.parsedData as any
    if (!data) continue
    if (Array.isArray(data)) {
      for (const trial of data) {
        if (pred && !pred(trial)) continue
        const v = trial?.[variableName]
        const num = toNumber(v)
        if (num !== null) values.push(num)
      }
    } else if (typeof data === "object") {
      if (pred && !pred(data)) continue
      const v = (data as any)[variableName]
      const num = toNumber(v)
      if (num !== null) values.push(num)
    }
  }
  return values
}

function extractAllValuesWithPredicate(
  enrichedResult: EnrichedJatosStudyResult,
  variableName: string,
  pred?: (row: any) => boolean
): any[] {
  const values: any[] = []
  for (const comp of enrichedResult.componentResults) {
    const data = comp.parsedData as any
    if (!data) continue
    if (Array.isArray(data)) {
      for (const trial of data) {
        if (pred && !pred(trial)) continue
        const v = trial?.[variableName]
        if (v !== undefined && v !== null) values.push(v)
      }
    } else if (typeof data === "object") {
      if (pred && !pred(data)) continue
      const v = (data as any)[variableName]
      if (v !== undefined && v !== null) values.push(v)
    }
  }
  return values
}

// Extract filtered variable values for variable rendering with filters
function extractFilteredVariableValues(
  enrichedResult: EnrichedJatosStudyResult,
  variableName: string,
  pred?: (row: any) => boolean
): Primitive[] {
  const values: Primitive[] = []
  for (const comp of enrichedResult.componentResults) {
    const data = comp.parsedData as any
    if (!data) continue
    if (Array.isArray(data)) {
      for (const trial of data) {
        if (pred && !pred(trial)) continue
        const v = trial?.[variableName]
        if (v !== undefined && v !== null) values.push(normalizeValue(v))
      }
    } else if (typeof data === "object") {
      if (pred && !pred(data)) continue
      const v = (data as any)[variableName]
      if (v !== undefined && v !== null) values.push(normalizeValue(v))
    }
  }
  return values
}

// Build a constrained predicate from a simple where clause with ANDs
function buildPredicate(whereClause: string): (row: any) => boolean {
  let clause = whereClause.replace(/\s+/g, " ").trim()
  const parts = clause
    .replace(/\|\|/g, " or ")
    .replace(/&&/g, " and ")
    .toLowerCase()
    .split(/\band\b/)
    .map((p) => p.trim())
    .filter(Boolean)

  const predicates: ((row: any) => boolean)[] = []
  const MAX_PREDICATES = 3
  for (let i = 0; i < Math.min(parts.length, MAX_PREDICATES); i++) {
    const p = parts[i]
    const pred = parseSimplePredicate(p)
    if (pred) predicates.push(pred)
  }

  return (row: any) =>
    predicates.every((fn) => {
      try {
        return fn(row)
      } catch {
        return false
      }
    })
}

function parseSimplePredicate(p: string): ((row: any) => boolean) | null {
  const inMatch = p.match(/^([a-zA-Z0-9_\.]+)\s+in\s*\[(.*)\]$/)
  if (inMatch) {
    const field = inMatch[1]
    const listRaw = inMatch[2]
    const items = listRaw
      .split(",")
      .map((s) => parseLiteral(s.trim()))
      .filter((v) => v !== undefined)
    return (row: any) => items.includes(resolveField(row, field))
  }

  const cmpMatch = p.match(/^([a-zA-Z0-9_\.]+)\s*(==|!=|>=|<=|>|<)\s*(.+)$/)
  if (cmpMatch) {
    const field = cmpMatch[1]
    const op = cmpMatch[2]
    const rhs = parseLiteral(cmpMatch[3].trim())
    return (row: any) => compare(resolveField(row, field), op, rhs)
  }

  return null
}

function parseLiteral(token: string): any {
  if (token.startsWith('"') || token.startsWith("'")) {
    try {
      return JSON.parse(token.replace(/'/g, '"'))
    } catch {
      return token.slice(1, -1)
    }
  }
  if (token === "true") return true
  if (token === "false") return false
  if (token === "null") return null
  if (!isNaN(Number(token))) return Number(token)
  return token
}

function resolveField(obj: any, path: string): any {
  const parts = path.split(".")
  let cur: any = obj
  for (const k of parts) {
    if (cur == null) return undefined
    cur = cur[k]
  }
  return cur
}

function compare(lhs: any, op: string, rhs: any): boolean {
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

// Extremely small expression evaluator: supports comparisons with var: and literals, and &&, ||, !
function evalExpr(expr: string, ctx: RenderContext): boolean {
  const vars = buildParticipantVarMap(ctx.enrichedResult)
  // Replace var:foo with literal values (use first value for comparison)
  let e = expr.replace(
    /var:([a-zA-Z0-9_\.]+)(?::([a-zA-Z0-9_]+))?/g,
    (_, name: string, modifier?: string) => {
      const values = vars[name]
      if (!values || values.length === 0) return "null"

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
          // For expressions, use first value as default
          value = values[0]
          break
      }

      if (typeof value === "number" || typeof value === "boolean") return String(value)
      if (value === null || value === undefined) return "null"
      // string: wrap in quotes and escape
      return JSON.stringify(String(value))
    }
  )
  // Allow only a safe subset
  // Replace logical operators words to JS operators if present
  e = e
    .replace(/\band\b/g, "&&")
    .replace(/\bor\b/g, "||")
    .replace(/\bnot\b/g, "!")
  // Remove any disallowed characters beyond a safe whitelist
  if (/[^\w\s\d\+\-\*\/%<>=!&|\(\)\.'",]/.test(e)) return false
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function(`return (${e});`)
    const res = fn()
    return Boolean(res)
  } catch {
    return false
  }
}
