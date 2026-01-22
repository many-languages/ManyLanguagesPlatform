import type { PreviewRenderContext, Primitive } from "./previewContext"

export function renderTemplateWithContext(template: string, ctx: PreviewRenderContext): string {
  let out = template

  const ifBlockRegex = /\{\{#if\s+([^}]+)\}\}([\s\S]*?)\{\{\/?else\}\}([\s\S]*?)\{\{\/?if\}\}/g
  const ifBlockNoElseRegex = /\{\{#if\s+([^}]+)\}\}([\s\S]*?)\{\{\/?if\}\}/g

  out = out.replace(ifBlockRegex, (_m, expr: string, thenPart: string, elsePart: string) => {
    const ok = evalExprWithContext(expr, ctx)
    return ok ? thenPart : elsePart
  })
  out = out.replace(ifBlockNoElseRegex, (_m, expr: string, thenPart: string) => {
    const ok = evalExprWithContext(expr, ctx)
    return ok ? thenPart : ""
  })

  out = out.replace(
    /\{\{\s*var:([a-zA-Z0-9_\.]+)(?::([a-zA-Z0-9_]+))?(?:\s*\|\s*where:\s*([\s\S]*?))?\s*\}\}/g,
    (_m, name: string, modifier?: string, whereClause?: string) => {
      const values = getVariableValues(ctx, name, whereClause)
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
    /\{\{\s*stat:([a-zA-Z0-9_\.]+)\.(avg|median|sd|count)(?::(within|across))?(?:\s*\|\s*where:\s*([\s\S]*?))?\s*\}\}/g,
    (_m, varName: string, metric: string, _scope?: string, whereClause?: string) => {
      const values = getVariableValues(ctx, varName, whereClause)
      if (metric === "count") return String(values.length)
      const series = toNumericSeries(values)
      if (metric === "avg") return safeNum(mean(series))
      if (metric === "median") return safeNum(median(series))
      if (metric === "sd") return safeNum(sd(series))
      return ""
    }
  )

  return out
}

function getVariableValues(
  ctx: PreviewRenderContext,
  variableName: string,
  whereClause?: string
): Primitive[] {
  const values = ctx.vars[variableName] ?? []
  if (!whereClause) return values
  const pred = buildPredicate(whereClause)
  const filtered: Primitive[] = []
  for (const row of Object.values(ctx.rows)) {
    if (!pred(row)) continue
    if (row[variableName] !== undefined) {
      filtered.push(row[variableName] ?? null)
    }
  }
  return filtered
}

function toNumericSeries(values: Primitive[]): number[] {
  const series: number[] = []
  for (const value of values) {
    if (typeof value === "number") {
      series.push(value)
    } else if (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))) {
      series.push(Number(value))
    }
  }
  return series
}

function safeNum(n: number | null): string {
  return n === null ? "" : String(round(n, 2))
}

function round(n: number, d: number): number {
  const f = Math.pow(10, d)
  return Math.round(n * f) / f
}

function mean(xs: number[]): number | null {
  if (xs.length === 0) return null
  return xs.reduce((a, b) => a + b, 0) / xs.length
}

function median(xs: number[]): number | null {
  if (xs.length === 0) return null
  const s = [...xs].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid]
}

function sd(xs: number[]): number | null {
  if (xs.length === 0) return null
  const m = mean(xs)!
  const v = xs.reduce((acc, x) => acc + (x - m) * (x - m), 0) / xs.length
  return Math.sqrt(v)
}

function evalExprWithContext(expr: string, ctx: PreviewRenderContext): boolean {
  let e = expr.replace(
    /var:([a-zA-Z0-9_\.]+)(?::([a-zA-Z0-9_]+))?/g,
    (_m, name: string, modifier?: string) => {
      const values = ctx.vars[name] ?? []
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
    }
  )
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

function buildPredicate(whereClause: string): (row: Record<string, Primitive>) => boolean {
  let clause = whereClause.replace(/\s+/g, " ").trim()
  const parts = clause
    .replace(/\|\|/g, " or ")
    .replace(/&&/g, " and ")
    .toLowerCase()
    .split(/\band\b/)
    .map((p) => p.trim())
    .filter(Boolean)

  const predicates: ((row: Record<string, Primitive>) => boolean)[] = []
  const MAX_PREDICATES = 3
  for (let i = 0; i < Math.min(parts.length, MAX_PREDICATES); i++) {
    const p = parts[i]
    const pred = parseSimplePredicate(p)
    if (pred) predicates.push(pred)
  }

  return (row: Record<string, Primitive>) =>
    predicates.every((fn) => {
      try {
        return fn(row)
      } catch {
        return false
      }
    })
}

function parseSimplePredicate(p: string): ((row: Record<string, Primitive>) => boolean) | null {
  const inMatch = p.match(/^([a-zA-Z0-9_\.]+)\s+in\s*\[(.*)\]$/)
  if (inMatch) {
    const field = inMatch[1]
    const listRaw = inMatch[2]
    const items = listRaw
      .split(",")
      .map((s) => parseLiteral(s.trim()))
      .filter((v) => v !== undefined)
    return (row: Record<string, Primitive>) => items.includes(resolveField(row, field))
  }

  const cmpMatch = p.match(/^([a-zA-Z0-9_\.]+)\s*(==|!=|>=|<=|>|<)\s*(.+)$/)
  if (cmpMatch) {
    const field = cmpMatch[1]
    const op = cmpMatch[2]
    const rhs = parseLiteral(cmpMatch[3].trim())
    return (row: Record<string, Primitive>) => compare(resolveField(row, field), op, rhs)
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

function resolveField(obj: Record<string, Primitive>, path: string): any {
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
