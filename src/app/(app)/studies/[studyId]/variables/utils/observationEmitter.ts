import type { ExtractionObservation, RowKeyEntry, ScopeKeys } from "../types"
import type { JsonPath } from "./path"
import { toVariableKey, toSourcePath, toKeyPath, Path } from "./path"
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
 * Compute rowKeyId from rowKey array for efficient joining
 * Format: "arrayId#index|arrayId#index|..."
 * Returns "root" when there are no arrays in the path (non-array values).
 * In that case, use (scopeKeys, variable) to identify the slot.
 */
function computeRowKeyId(rowKey: RowKeyEntry[]): string {
  if (rowKey.length === 0) {
    return "root"
  }
  return rowKey.map((f) => `${f.arrayId}#${f.index}`).join("|")
}

/**
 * Observation Emitter - constructs ExtractionObservation objects consistently
 */
export function emitObservation(
  path: JsonPath,
  value: any,
  rowKey: RowKeyEntry[],
  scopeKeys: ScopeKeys
): ExtractionObservation {
  const valueJson = safeStringify(value)
  const rowKeyId = computeRowKeyId(rowKey)
  return {
    variableKey: toVariableKey(path),
    path: toSourcePath(path),
    keyPath: toKeyPath(path),
    valueType: getValueType(value),
    valueJson,
    rowKey,
    rowKeyId,
    scopeKeys,
    depth: Path.depth(path),
  }
}
