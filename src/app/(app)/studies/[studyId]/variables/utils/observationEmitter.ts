import type {
  ExtractionObservation,
  RowKeyEntry,
  ScopeKeys,
  ValueDiagnosticMetadata,
  ValueType,
} from "../types"
import type { JsonPath } from "./path"
import { toVariableKey, toSourcePath, toKeyPath, Path } from "./path"
import { getValueType } from "./typeGuards"

/**
 * Extract diagnostic metadata from a value before stringification.
 * This avoids parsing JSON later and provides needed info for variable diagnostics.
 * Only extracts metadata for string and array types (where it's needed).
 */
function extractValueDiagnosticMetadata(
  value: any,
  valueType: ValueType,
  maxDistinctTracking: number
): ValueDiagnosticMetadata | undefined {
  // Only extract metadata for types that need it in diagnostics
  if (valueType !== "string" && valueType !== "array") {
    return undefined
  }

  const metadata: ValueDiagnosticMetadata = {
    length: 0, // Will be set below
  }

  if (valueType === "string") {
    const str = String(value)
    metadata.length = str.length
    metadata.stringValue = str // Store actual string for distinct tracking
  } else if (valueType === "array" && Array.isArray(value)) {
    const arr = value as any[]
    metadata.length = arr.length

    if (arr.length > 0) {
      const firstValueType = getValueType(arr[0])
      const allSameType = arr.every((x) => getValueType(x) === firstValueType)

      if (allSameType) {
        metadata.arrayElementInfo = { kind: "uniform", type: firstValueType }

        // Only store string values if it's an array of strings (for distinct options tracking)
        // Limit upfront to avoid memory issues (uses config value)
        if (firstValueType === "string") {
          metadata.arrayStringValues = arr
            .filter((x): x is string => typeof x === "string")
            .slice(0, maxDistinctTracking)
        }
      } else {
        metadata.arrayElementInfo = { kind: "mixed" }
      }
    }
  }

  return metadata
}

/**
 * Compute rowKeyId from rowKey array for efficient joining
 * Format: "arrayKey#index|arrayKey#index|..."
 * Returns "root" when there are no arrays in the path (non-array values).
 * In that case, use (scopeKeys, variable) to identify the slot.
 */
function computeRowKeyId(rowKey: RowKeyEntry[]): string {
  if (rowKey.length === 0) {
    return "root"
  }
  return rowKey.map((f) => `${f.arrayKey}#${f.index}`).join("|")
}

/**
 * Compute scopeKeyId from scopeKeys for efficient joining
 * Format: "componentId:1|workerId:2" (sorted keys, undefined values filtered)
 */
export function computeScopeKeyId(scopeKeys: ScopeKeys): string {
  return Object.entries(scopeKeys)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${String(v)}`)
    .join("|")
}

/**
 * Observation Emitter - constructs ExtractionObservation objects consistently
 */
export function emitObservation(
  path: JsonPath,
  value: any,
  rowKey: RowKeyEntry[],
  scopeKeys: ScopeKeys,
  scopeKeyId: string,
  maxDistinctTracking: number
): ExtractionObservation {
  const valueType = getValueType(value)

  // Extract diagnostic metadata before stringifying (while we still have the raw value)
  let diagnosticMetadata = extractValueDiagnosticMetadata(value, valueType, maxDistinctTracking)

  // Stringify with error handling
  let valueJson: string
  try {
    valueJson = JSON.stringify(value)
  } catch (error) {
    // Handle stringify errors - update metadata if we have it
    if (error instanceof TypeError && error.message.includes("circular")) {
      valueJson = '"[Circular]"'
      if (diagnosticMetadata) {
        diagnosticMetadata.stringifyError = "circular"
      } else {
        // If metadata wasn't created yet (shouldn't happen for string/array), create it now
        diagnosticMetadata = extractValueDiagnosticMetadata(value, valueType, maxDistinctTracking)
        if (diagnosticMetadata) {
          diagnosticMetadata.stringifyError = "circular"
        }
      }
    } else {
      const errorMsg = error instanceof Error ? error.message : String(error)
      valueJson = `"[StringifyError: ${errorMsg}]"`
      if (diagnosticMetadata) {
        diagnosticMetadata.stringifyError = "stringify_error"
      } else {
        // If metadata wasn't created yet, create it now
        diagnosticMetadata = extractValueDiagnosticMetadata(value, valueType, maxDistinctTracking)
        if (diagnosticMetadata) {
          diagnosticMetadata.stringifyError = "stringify_error"
        }
      }
    }
  }

  const rowKeyId = computeRowKeyId(rowKey)
  const sourcePath = toSourcePath(path)
  const keyPath = toKeyPath(path)

  // Pre-compute derived values for efficient diagnostics (avoid recomputation)
  // JSON-encode each segment to handle keys containing dots unambiguously
  const keyPathString = keyPath.map((seg) => JSON.stringify(seg)).join(".")
  const hasArrayIndices = path.some((seg) => seg.kind === "index")

  return {
    variableKey: toVariableKey(path),
    path: sourcePath,
    keyPath,
    valueType,
    valueJson,
    rowKey,
    rowKeyId,
    scopeKeys,
    depth: Path.depth(path),
    diagnosticMetadata, // Attach the metadata
    scopeKeyId, // Pre-computed from scopeKeys
    keyPathString, // Pre-computed from keyPath
    hasArrayIndices, // Pre-computed from path
  }
}
