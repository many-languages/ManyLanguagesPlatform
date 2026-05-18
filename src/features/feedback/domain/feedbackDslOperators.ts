export interface DslOperator {
  key: string
  label: string
}

/** Normalises array/object variable types to string for operator selection purposes. */
function normalizeVariableType(variableType: string): string {
  return variableType === "array" || variableType === "object" ? "string" : variableType
}

const BASE_OPERATORS: Array<DslOperator & { types: string[] }> = [
  { key: "==", label: "equals", types: ["string", "number", "boolean"] },
  { key: "!=", label: "not equals", types: ["string", "number", "boolean"] },
  { key: ">", label: "greater than", types: ["number"] },
  { key: "<", label: "less than", types: ["number"] },
  { key: ">=", label: "greater or equal", types: ["number"] },
  { key: "<=", label: "less or equal", types: ["number"] },
]

/** `in` is valid only in where-clause filters, not in #if conditions. */
const FILTER_ONLY_OPERATORS: Array<DslOperator & { types: string[] }> = [
  { key: "in", label: "in list", types: ["string", "number"] },
]

/**
 * Operators available in `{{#if expr op value}}` conditional blocks.
 */
export function getConditionalOperators(variableType: string): DslOperator[] {
  const t = normalizeVariableType(variableType)
  return BASE_OPERATORS.filter((op) => op.types.includes(t))
}

/**
 * Operators available in `| where: field op value` filter clauses.
 * Superset of conditional operators; adds `in`.
 */
export function getFilterOperators(variableType: string): DslOperator[] {
  const t = normalizeVariableType(variableType)
  return [
    ...BASE_OPERATORS.filter((op) => op.types.includes(t)),
    ...FILTER_ONLY_OPERATORS.filter((op) => op.types.includes(t)),
  ]
}
