import type { FeedbackRenderContext, Primitive } from "./types"

/** All rows matching optional `where` (for `stat:...:across` when not using precomputed stats). */
export function collectVariableValuesAcrossAllRows(
  ctx: FeedbackRenderContext,
  variableName: string,
  whereClause?: string
): Primitive[] {
  const pred = whereClause ? buildPredicate(whereClause) : undefined
  const filtered: Primitive[] = []
  for (const [, row] of Object.entries(ctx.rows)) {
    if (pred && !pred(row)) continue
    if (row[variableName] !== undefined) {
      filtered.push(row[variableName] ?? null)
    }
  }
  return filtered
}

export function buildPredicate(whereClause: string): (row: Record<string, Primitive>) => boolean {
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
    const field = inMatch[1]!
    const listRaw = inMatch[2]!
    const items = listRaw
      .split(",")
      .map((s) => parseLiteral(s.trim()))
      .filter((v): v is NonNullable<typeof v> => v !== undefined)
    return (row: Record<string, Primitive>) => {
      const fv = resolveField(row, field)
      return items.some((x) => x === fv)
    }
  }

  const cmpMatch = p.match(/^([a-zA-Z0-9_\.]+)\s*(==|!=|>=|<=|>|<)\s*(.+)$/)
  if (cmpMatch) {
    const field = cmpMatch[1]!
    const op = cmpMatch[2]!
    const rhs = parseLiteral(cmpMatch[3]!.trim())
    return (row: Record<string, Primitive>) => compare(resolveField(row, field), op, rhs)
  }

  return null
}

function parseLiteral(token: string): unknown {
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

function resolveField(obj: Record<string, Primitive>, path: string): unknown {
  const parts = path.split(".")
  let cur: unknown = obj
  for (const k of parts) {
    if (cur == null || typeof cur !== "object") return undefined
    cur = (cur as Record<string, unknown>)[k]
  }
  return cur
}

function compare(lhs: unknown, op: string, rhs: unknown): boolean {
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
