import { VariableType, ValueType } from "../types"

/**
 * Determine VariableType from variableTypes map
 */
export function determineVariableType(
  variableKey: string,
  variableTypes: Map<string, Map<string, { count: number; examplePaths: string[] }>>
): VariableType {
  const typeMap = variableTypes.get(variableKey)
  if (!typeMap) {
    return "string" // Default fallback
  }

  // Remove null from consideration
  const nonNullTypes = Array.from(typeMap.entries())
    .filter(([type, data]) => type !== "null" && data.count > 0)
    .map(([type]) => type as ValueType)

  if (nonNullTypes.length === 0) {
    return "string" // Default fallback
  }

  if (nonNullTypes.length === 1) {
    const singleType = nonNullTypes[0]
    // Map ValueType to VariableType
    if (singleType === "boolean") return "boolean"
    if (singleType === "number") return "number"
    if (singleType === "string") return "string"
    if (singleType === "array") return "array"
    if (singleType === "object") return "object"
  }

  // Multiple types - default to string
  return "string"
}
