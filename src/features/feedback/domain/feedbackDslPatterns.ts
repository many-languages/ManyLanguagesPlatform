/**
 * Single source of truth for feedback template DSL surface syntax (regex factories + where-clause helpers).
 * Used by renderer, dslValidator, requiredVariableNames, stat/aggregation.
 *
 * Always call `create*Regex()` for a fresh `RegExp` when using `exec` in a loop (sticky global state).
 */

const IDENT = String.raw`[a-zA-Z0-9_\.]+`
const MOD = String.raw`[a-zA-Z0-9_]+`

/** Keywords / operators not treated as row field names inside `where:` clauses. */
const WHERE_SKIP_TOKENS = new Set([
  "and",
  "or",
  "not",
  "in",
  "true",
  "false",
  "==",
  "!=",
  ">",
  "<",
  ">=",
  "<=",
])

function shouldSkipWhereFieldName(fieldName: string): boolean {
  if (WHERE_SKIP_TOKENS.has(fieldName)) return true
  if (/^[0-9]+(\.[0-9]+)?$/.test(fieldName)) return true
  return false
}

/** `{{ var:name[:modifier] [| where: …] }}` */
export function createVarPlaceholderRegex(): RegExp {
  return new RegExp(
    String.raw`\{\{\s*var:(${IDENT})(?::(${MOD}))?(?:\s*\|\s*where:\s*([\s\S]*?))?\s*\}\}`,
    "g"
  )
}

/** Bare `var:name[:modifier]` inside `#if` conditions (no `{{ }}`). */
export function createBareVarReferenceRegex(): RegExp {
  return new RegExp(String.raw`var:(${IDENT})(?::(${MOD}))?`, "g")
}

/** `{{ stat:var.metric[:scope] [| where: …] }}` — keep in sync with metrics in renderer/validator. */
export function createFeedbackStatPlaceholderRegex(): RegExp {
  return new RegExp(
    String.raw`\{\{\s*stat:(${IDENT})\.(avg|median|sd|count)(?::(within|across))?(?:\s*\|\s*where:\s*([\s\S]*?))?\s*\}\}`,
    "g"
  )
}

/** Renderer: `#if` with `{{else}}`. */
export function createIfBlockWithElseRegex(): RegExp {
  return /\{\{#if\s+([^}]+)\}\}([\s\S]*?)\{\{\/?else\}\}([\s\S]*?)\{\{\/?if\}\}/g
}

/** Renderer: `#if` without else. */
export function createIfBlockNoElseRegex(): RegExp {
  return /\{\{#if\s+([^}]+)\}\}([\s\S]*?)\{\{\/?if\}\}/g
}

/** Validator: optional `{{else}}` between branches. */
export function createConditionalBlockRegex(): RegExp {
  return /\{\{#if\s+([^}]+)\}\}([\s\S]*?)(?:\{\{else\}\}([\s\S]*?))?\{\{\/?if\}\}/g
}

/** Rough `{{ var:… }}` span scan for malformed-syntax pass (same idea as validator). */
export function createMalformedVarSpanRegex(): RegExp {
  return /\{\{\s*var:[^}]*\}\}/g
}

/** Rough `{{ stat:… }}` span scan for malformed-syntax pass. */
export function createMalformedStatSpanRegex(): RegExp {
  return /\{\{\s*stat:[^}]*\}\}/g
}

/** Strict shape test for a full `{{ var:… }}` placeholder (single segment). */
export function createVarPlaceholderWellFormedPattern(): RegExp {
  return /^\{\{\s*var:[a-zA-Z0-9_\.]+(?::[a-zA-Z0-9_]+)?(?:\s*\|\s*where:\s*[^}]*)?\s*\}\}$/
}

/** Strict shape test for a full `{{ stat:… }}` placeholder (single segment). */
export function createStatPlaceholderWellFormedPattern(): RegExp {
  return /^\{\{\s*stat:[a-zA-Z0-9_\.]+\.[a-zA-Z0-9_]+(?::(within|across))?(?:\s*\|\s*where:\s*[^}]*)?\s*\}\}$/
}

export interface WhereFieldRef {
  name: string
  start: number
  end: number
}

/**
 * Field-like identifiers in a `where:` clause (for dependency extraction and validation).
 * Positions are relative to `whereClause`.
 */
export function findWhereClauseFieldReferences(whereClause: string): WhereFieldRef[] {
  const out: WhereFieldRef[] = []
  const fieldRegex = /\b([a-zA-Z0-9_\.]+)\b/g
  let fieldMatch: RegExpExecArray | null
  while ((fieldMatch = fieldRegex.exec(whereClause)) !== null) {
    const fieldName = fieldMatch[1]!
    if (shouldSkipWhereFieldName(fieldName)) continue
    out.push({
      name: fieldName,
      start: fieldMatch.index,
      end: fieldMatch.index + fieldName.length,
    })
  }
  return out
}

/** Unique field names referenced in a where clause (dependency extraction). */
export function extractFieldNamesFromWhereClause(whereClause: string): string[] {
  const names = new Set<string>()
  for (const ref of findWhereClauseFieldReferences(whereClause)) {
    names.add(ref.name)
  }
  return Array.from(names)
}
