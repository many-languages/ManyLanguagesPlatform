/**
 * Pure DSL expression builders for the feedback template language.
 * All functions are free of UI/React dependencies and are fully unit-testable.
 *
 * DSL surface syntax (see feedbackDslPatterns.ts for the corresponding regexes):
 *   {{ var:name[:modifier] [| where: clause] }}
 *   {{ stat:name.metric[:scope] [| where: clause] }}
 *   {{#if expression operator value}}...{{else}}...{{/if}}
 *   | where: field op value [and|or field op value ...]
 */

// ---------------------------------------------------------------------------
// Filter clause
// ---------------------------------------------------------------------------

export interface FilterCondition {
  field: string
  operator: string
  value: string
  logicalOperator?: "and" | "or"
}

/**
 * Builds the raw filter clause body (without the leading `| where:` prefix).
 * Returns an empty string when no valid conditions exist.
 *
 * @example buildFilterClause([{ field: "x", operator: "==", value: "1" }])
 *   // → "x == 1"
 */
export function buildFilterClause(conditions: FilterCondition[]): string {
  const valid = conditions.filter((c) => c.field && c.operator && c.value !== "")
  if (valid.length === 0) return ""
  return valid
    .map((c, i) => {
      const expr =
        c.operator === "in" ? `${c.field} in [${c.value}]` : `${c.field} ${c.operator} ${c.value}`
      return i > 0 && c.logicalOperator ? `${c.logicalOperator} ${expr}` : expr
    })
    .join(" ")
}

// ---------------------------------------------------------------------------
// Variable placeholder  {{ var:name[:modifier] [| where: clause] }}
// ---------------------------------------------------------------------------

/**
 * @param filterClause Raw clause body (no `| where:` prefix), or empty string.
 */
export function buildVarExpression(
  variable: string,
  modifier: string,
  filterClause?: string
): string {
  let expr = `{{ var:${variable}`
  if (modifier !== "all") expr += `:${modifier}`
  if (filterClause) expr += ` | where: ${filterClause}`
  expr += " }}"
  return expr
}

// ---------------------------------------------------------------------------
// Stat placeholder  {{ stat:name.metric[:scope] [| where: clause] }}
// ---------------------------------------------------------------------------

/**
 * @param filterClause Raw clause body (no `| where:` prefix), or empty string.
 */
export function buildStatExpression(
  variable: string,
  metric: string,
  scope: string,
  filterClause?: string
): string {
  let expr = `{{ stat:${variable}.${metric}:${scope}`
  if (filterClause) expr += ` | where: ${filterClause}`
  expr += " }}"
  return expr
}

// ---------------------------------------------------------------------------
// Conditional block  {{#if ...}}...{{else}}...{{/if}}
// ---------------------------------------------------------------------------

export interface ConditionalBlockParams {
  conditionType: "variable" | "statistic"
  selectedVariable: string
  selectedModifier: string
  selectedMetric: string
  /** Raw clause body (no `| where:` prefix), or empty string. */
  filterClause: string
  operator: string
  value: string
  thenContent: string
  elseContent: string
  includeElse: boolean
}

export function buildConditionalBlock(p: ConditionalBlockParams): string {
  let expression = ""

  if (p.conditionType === "variable") {
    expression = `var:${p.selectedVariable}`
    if (p.selectedModifier !== "all") expression += `:${p.selectedModifier}`
    if (p.filterClause) expression += ` | where: ${p.filterClause}`
  } else {
    expression = `stat:${p.selectedVariable}.${p.selectedMetric}`
    if (p.filterClause) expression += ` | where: ${p.filterClause}`
  }

  expression += ` ${p.operator} ${p.value}`
  const elsePart = p.includeElse ? `{{else}}${p.elseContent}{{/if}}` : "{{/if}}"
  return `{{#if ${expression}}}${p.thenContent}${elsePart}`
}

/**
 * Builds only the `#if` expression fragment (for live syntax previews).
 * Returns an empty string when the form is incomplete.
 */
export function buildConditionalPreview(
  p: Pick<
    ConditionalBlockParams,
    | "conditionType"
    | "selectedVariable"
    | "selectedModifier"
    | "selectedMetric"
    | "filterClause"
    | "operator"
    | "value"
  >
): string {
  if (!p.selectedVariable || !p.operator || !p.value) return ""

  let expression = ""
  if (p.conditionType === "variable") {
    expression = `var:${p.selectedVariable}`
    if (p.selectedModifier !== "all") expression += `:${p.selectedModifier}`
    if (p.filterClause) expression += ` | where: ${p.filterClause}`
  } else {
    expression = `stat:${p.selectedVariable}.${p.selectedMetric}`
    if (p.filterClause) expression += ` | where: ${p.filterClause}`
  }

  return `{{#if ${expression} ${p.operator} ${p.value}}}`
}
