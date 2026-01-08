// Variable Types - Shared across features (codebook, feedback, admin, etc.)

export type VariableType = "string" | "number" | "boolean" | "array" | "object"

// New extraction system types
export type ValueType = "null" | "boolean" | "number" | "string" | "array" | "object"

export interface RowKeyEntry {
  arrayId: string // Structural identity of the array (e.g., "trials[*]" or "trials[*].responses[*]")
  index: number // Index within that array
}

export interface ScopeKeys {
  componentId: number // Component ID where this observation was extracted from
  workerId?: number // JATOS worker ID (optional, for future use)
  batchId?: string // JATOS batch ID (optional, for future use)
  groupId?: string // JATOS group ID (optional, for future use)
}

export interface ExtractionObservation {
  variableKey: string // wildcarded path, e.g. trials[*].rt
  path: string // exact path, e.g. trials[0].rt
  keyPath: string[] // structural breadcrumb: sequence of object keys and [*] for arrays, e.g. ["trials", "*", "stimulus", "color"] for trials[3].stimulus.color
  valueType: ValueType
  valueJson: string // JSON.stringify(value)
  rowKey: RowKeyEntry[] // Structural identity for array instances: which instance in which array nesting, e.g. [{ arrayId: "trials[*]", index: 0 }, { arrayId: "trials[*].responses[*]", index: 2 }]
  rowKeyId: string // String representation of rowKey for efficient joining: "trials[*]#0|trials[*].responses[*]#2" or "root" for non-array values
  scopeKeys: ScopeKeys // Execution context keys (componentId, and optionally workerId, batchId, groupId from JATOS)
  depth: number // Nesting depth (0 = root level)
}

export type DiagnosticSeverity = "error" | "warning"

export type DiagnosticLevel = "component" | "run" | "variable"

export type DiagnosticCode =
  | "TYPE_DRIFT"
  | "DUPLICATE_OBSERVATION"
  | "HIGH_CARDINALITY"
  | "EXPLODING_CARDINALITY"
  | "DEEP_NESTING"
  | "MAX_NODES_EXCEEDED"
  | "MAX_OBSERVATIONS_EXCEEDED"
  | "MAX_DEPTH_EXCEEDED"
  | "PARSE_ERROR"
  | "TEXT_FORMAT_NOT_SUPPORTED"
  | "UNKNOWN_FORMAT"
  | "SKIPPED_NON_JSON_TYPE"
  | "VALUE_JSON_PARSE_FAILED"
  | "VALUE_JSON_UNSERIALIZABLE_FALLBACK_USED"
  | "HIGH_NULL_RATE"
  | "MANY_NULLS"
  | "MIXED_ARRAY_ELEMENT_TYPES"
  | "HIGH_OCCURRENCE"
  | "LARGE_VALUES"
  | "UNEXPECTED_OBJECT_ARRAY_LEAF"
  | "VARIABLE_KEY_COLLISION"
  | "ROW_KEY_ID_ANOMALY"
  | "EMPTY_OR_NO_DATA"
  | "TRUNCATED_EXTRACTION"

export interface Diagnostic {
  severity: DiagnosticSeverity
  code: DiagnosticCode
  level: DiagnosticLevel
  message: string
  metadata?: Record<string, any>
}

export interface ExtractionStats {
  nodeCount: number
  observationCount: number
  maxDepth: number
}

// Forward declaration - DiagnosticEngine is defined in utils/diagnostics.ts
// We use any here to avoid circular dependencies, but it should be DiagnosticEngine
export interface NewExtractionResult {
  observations: ExtractionObservation[]
  componentDiagnostics: Map<string, Diagnostic[]> // keyed by componentId
  runDiagnostics: Diagnostic[]
  stats: ExtractionStats
  diagnosticEngine: any // DiagnosticEngine - Expose for accessing facts/counts during aggregation
}

export interface VariableExample {
  value: string // JSON.stringify(value) from the observation
  sourcePath: string // The exact path where this example value was found (e.g., "trials[0].rt")
}

export type VariableFlag =
  | "TYPE_DRIFT" // Multiple VariableType observed for same variable
  | "MANY_NULLS" // Null rate above threshold (e.g. ≥ 20%)
  | "MIXED_ARRAY_ELEMENT_TYPES" // Array-of-primitives but elements have mixed types
  | "HIGH_OCCURRENCE" // observationCount > threshold (e.g. 10k)
  | "HIGH_CARDINALITY" // Too many distinct string values/options
  | "LARGE_VALUES" // Very long strings or very long arrays (e.g. maxLen > 5k)

export type VariableHeuristicThresholds = {
  manyNulls: number
  highNullRate: number
  highOccurrence: number
  highCardinality: number
  largeValueLength: number
}

export interface ExtractedVariable {
  variableKey: string // Structural variable key with $ prefix, e.g. $trials[*].rt
  variableName: string // Human-readable prettified name without quotes and root, e.g. "rt" or "Quality: easy to use"
  examples: VariableExample[] // Array of examples, each with value and sourcePath from the same observation
  type: VariableType // Final variable type for consumers
  occurrences: number
  dataStructure: "array" | "object"
  componentIds: number[] // Component IDs where this variable was found
  flags: VariableFlag[] // Diagnostic flags for this variable
  depth: number // Nesting depth (0 = root level)
  // Extraction context
  isTopLevel: boolean // Is this a top-level key?
  diagnostics?: Diagnostic[] // Variable-level diagnostics (materialized from facts and computed from counts)
}

export type ValidationSeverity = "error" | "warning"

export interface SkippedValue {
  value: any
  path: string // Where it was found (e.g., "numbers", "numbers[*]", "")
  reason: SkippedReason
  context: string // Human-readable context description
  severity: ValidationSeverity // Error (skipped) or warning (not skipped but flagged)
}

export type SkippedReason =
  | "unnamed_primitive_at_root"
  | "unnamed_primitive_in_root_array"
  | "primitive_in_mixed_array"
  | "mixed_array_with_nested_arrays"
  | "array_of_arrays"
  | "text_format_not_supported"
  | "parse_error"

export interface ExtractionResult {
  variables: ExtractedVariable[] // Each has diagnostics field
  skippedValues: SkippedValue[]
  warnings: string[] // User-friendly warnings (for non-skipped issues)
  componentDiagnostics: Map<string, Diagnostic[]> // keyed by componentId
  runDiagnostics: Diagnostic[]
}

export interface AvailableVariable {
  name: string
  type: "string" | "number" | "boolean"
  example?: any
}
