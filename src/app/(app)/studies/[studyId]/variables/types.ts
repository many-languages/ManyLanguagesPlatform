// Variable Types - Shared across features (codebook, feedback, admin, etc.)

export interface ExtractedVariable {
  variableName: string
  exampleValue: string
  type: "primitive" | "object" | "array"
  occurrences: number
  dataStructure: "array" | "object"
  allValues: any[] // All values found for this variable
  componentIds: number[] // Component IDs where this variable was found
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
