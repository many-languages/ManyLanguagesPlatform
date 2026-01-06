// Variable Types - Shared across features (codebook, feedback, admin, etc.)

export type VariableType = "string" | "number" | "boolean" | "array" | "object"

// New extraction system types
export type ValueType = "null" | "boolean" | "number" | "string" | "array" | "object"

export interface ExtractionObservation {
  variable: string // wildcarded path, e.g. trials[*].rt
  path: string // exact path, e.g. trials[0].rt
  valueType: ValueType
  valueJson: string // JSON.stringify(value)
  context: Record<string, string | number> // Required - for grouping/joining
  componentId: number // Component ID where this observation was extracted from
  depth: number // Nesting depth (0 = root level)
}

export type DiagnosticSeverity = "error" | "warning"

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

export interface Diagnostic {
  severity: DiagnosticSeverity
  code: DiagnosticCode
  message: string
  metadata?: Record<string, any>
}

export interface ExtractionStats {
  nodeCount: number
  observationCount: number
  maxDepth: number
}

export interface NewExtractionResult {
  observations: ExtractionObservation[]
  diagnostics: Diagnostic[]
  stats: ExtractionStats
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
  | "TRUNCATED_EXTRACTION" // Extraction stopped early due to guardrails

export interface ExtractedVariable {
  variableName: string
  examples: VariableExample[] // Array of examples, each with value and sourcePath from the same observation
  type: VariableType // Final variable type for consumers
  occurrences: number
  dataStructure: "array" | "object"
  allValues: any[] // All values found for this variable
  componentIds: number[] // Component IDs where this variable was found
  flags: VariableFlag[] // Diagnostic flags for this variable
  depth: number // Nesting depth (0 = root level)
  // Extraction context
  isTopLevel: boolean // Is this a top-level key?
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
  variables: ExtractedVariable[]
  skippedValues: SkippedValue[]
  warnings: string[] // User-friendly warnings (for non-skipped issues)
}

export interface AvailableVariable {
  name: string
  type: "string" | "number" | "boolean"
  example?: any
}
