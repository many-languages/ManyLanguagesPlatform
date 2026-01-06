import type { ExtractionObservation } from "../types"
import type { JsonPath } from "./path"
import { toVariableKey, toSourcePath, Path } from "./path"
import { getValueType } from "./typeGuards"

/**
 * Safely stringify a value, handling circular references and other edge cases
 */
function safeStringify(value: any): string {
  try {
    return JSON.stringify(value)
  } catch (error) {
    // Handle circular references, BigInt, etc.
    if (error instanceof TypeError && error.message.includes("circular")) {
      return '"[Circular]"'
    }
    // For other stringify errors, return a placeholder
    return `"[StringifyError: ${error instanceof Error ? error.message : String(error)}]"`
  }
}

/**
 * Observation Emitter - constructs ExtractionObservation objects consistently
 */
export function emitObservation(
  path: JsonPath,
  value: any,
  context: Record<string, string | number>,
  componentId: number
): ExtractionObservation {
  const valueJson = safeStringify(value)
  return {
    variable: toVariableKey(path),
    path: toSourcePath(path),
    valueType: getValueType(value),
    valueJson,
    context,
    componentId,
    depth: Path.depth(path),
  }
}
