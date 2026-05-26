import type { FeedbackRenderContext, Primitive } from "./renderTypes"

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
  const terms = splitLogicalTerms(whereClause.replace(/\s+/g, " ").trim())
  const MAX_PREDICATES = 3
  const parts = terms.parts.slice(0, MAX_PREDICATES)
  const connectors = terms.connectors.slice(0, Math.max(0, parts.length - 1))
  const predicates = parts.map((part) => parseSimplePredicate(part))

  return (row: Record<string, Primitive>) => {
    if (predicates.length === 0) return false

    const results = predicates.map((fn) => {
      if (!fn) return false
      try {
        return fn(row)
      } catch {
        return false
      }
    })

    let groupResult = results[0] ?? false
    const orGroups: boolean[] = []
    for (let i = 0; i < connectors.length; i++) {
      const next = results[i + 1] ?? false
      if (connectors[i] === "and") {
        groupResult = groupResult && next
      } else {
        orGroups.push(groupResult)
        groupResult = next
      }
    }
    orGroups.push(groupResult)

    return orGroups.some(Boolean)
  }
}

function splitLogicalTerms(whereClause: string): {
  parts: string[]
  connectors: ("and" | "or")[]
} {
  const parts: string[] = []
  const connectors: ("and" | "or")[] = []
  let start = 0
  let quote: '"' | "'" | null = null

  for (let i = 0; i < whereClause.length; i++) {
    const ch = whereClause[i]
    if ((ch === '"' || ch === "'") && whereClause[i - 1] !== "\\") {
      quote = quote === ch ? null : quote ?? ch
      continue
    }
    if (quote) continue

    if (whereClause.startsWith("&&", i) || whereClause.startsWith("||", i)) {
      const part = whereClause.slice(start, i).trim()
      if (part) parts.push(part)
      connectors.push(whereClause.startsWith("&&", i) ? "and" : "or")
      i += 1
      start = i + 1
      continue
    }

    const wordMatch = whereClause.slice(i).match(/^(and|or)\b/i)
    if (!wordMatch || !isLogicalBoundary(whereClause[i - 1])) continue

    const part = whereClause.slice(start, i).trim()
    if (part) parts.push(part)
    connectors.push(wordMatch[1]!.toLowerCase() as "and" | "or")
    i += wordMatch[1]!.length - 1
    start = i + 1
  }

  const finalPart = whereClause.slice(start).trim()
  if (finalPart) parts.push(finalPart)

  return { parts, connectors }
}

function isLogicalBoundary(ch: string | undefined): boolean {
  return ch === undefined || /\s|\(/.test(ch)
}

function parseSimplePredicate(p: string): ((row: Record<string, Primitive>) => boolean) | null {
  const inMatch = p.match(/^([a-zA-Z0-9_\.]+)\s+in\s*\[(.*)\]$/i)
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
  if (Object.prototype.hasOwnProperty.call(obj, path)) {
    return obj[path]
  }

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
