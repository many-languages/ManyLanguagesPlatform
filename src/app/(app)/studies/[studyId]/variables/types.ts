// Variable Types - Shared across features (codebook, feedback, admin, etc.)

export type VariableType = "string" | "number" | "boolean" | "array" | "object"

// New extraction system types
export type ValueType = "null" | "boolean" | "number" | "string" | "array" | "object"

export interface RowKeyEntry {
  arrayKey: string // Structural identity of the array (e.g., "trials[*]" or "trials[*].responses[*]")
  index: number // Index within that array
}

export type VariableFacts = {
  counts: {
    variableCounts: Map<string, number>
    variableNullCounts: Map<string, number>
    variableUnserializableFallbacks: Map<string, number>
  }
  types: {
    variableTypes: Map<string, Map<string, { count: number; examplePaths: string[] }>>
    variableObjectArrayLeaves: Set<string>
  }
  shapes: {
    variableLengths: Map<string, { min?: number; max?: number }>
    variableHasMixedArrayElements: Set<string>
  }
  distinct: {
    strings: Map<string, Set<string>>
    options: Map<string, Set<string>>
  }
  invariants: {
    duplicates: {
      observationKeys: Map<string, Map<string, Set<string>>> // Map<variableKey, Map<scopeKeyId, Set<rowKeyId>>>
      duplicateObservationCounts: Map<string, number>
      duplicateObservationExamples: Map<
        string,
        { scopeKeyId: string; rowKeyId: string; path: string }
      >
    }
    collisions: {
      variableKeyPathMap: Map<string, string>
      variableKeyPathCounts: Map<string, Map<string, number>>
      variableKeyCollisionCounts: Map<string, number>
      variableKeyCollisionKeyPaths: Map<string, { first: string; second: string }>
    }
    rowKeyAnomalies: {
      rowKeyIdAnomalyCounts: Map<string, number>
      rowKeyIdAnomalyExamples: Map<string, { rowKeyId: string; path: string }>
    }
  }
}

export type RunEvent =
  | { kind: "MAX_DEPTH_EXCEEDED"; depth: number; threshold: number }
  | { kind: "MAX_NODES_EXCEEDED"; nodeCount: number; threshold: number }
  | { kind: "MAX_OBSERVATIONS_EXCEEDED"; observationCount: number; threshold: number }
  | { kind: "DEEP_NESTING"; depth: number; threshold: number }
  | { kind: "SKIPPED_NON_JSON_TYPE"; jsType: string; path: string; tag?: string }

export type RunLimitEvent = Extract<
  RunEvent,
  { kind: "MAX_DEPTH_EXCEEDED" | "MAX_NODES_EXCEEDED" | "MAX_OBSERVATIONS_EXCEEDED" }
>

export type RunDeepNestingEvent = Extract<RunEvent, { kind: "DEEP_NESTING" }>
export type RunSkippedNonJsonEvent = Extract<RunEvent, { kind: "SKIPPED_NON_JSON_TYPE" }>

export type RunFacts = {
  limits: Map<RunLimitEvent["kind"], RunLimitEvent> // first occurrence wins
  deepNesting: { threshold: number; maxDepth: number } // aggregate
  skippedNonJson: Map<string, { count: number; examplePaths: string[]; tag?: string }> // bucket by jsType
}

export interface ComponentFactsEntry {
  componentId: number
  detectedFormat?: string
  hasParsedData: boolean
  hasDataContent: boolean
  parseError?: string
  formatError?: { code: DiagnosticCode; message: string }
}

export type ComponentFacts = Map<number, ComponentFactsEntry>

export interface ScopeKeys {
  componentId: number // Component ID where this observation was extracted from
  studyResultId?: number // JATOS study result ID (unique per run)
  workerId?: number // JATOS worker ID (optional, for future use)
  batchId?: string // JATOS batch ID (optional, for future use)
  groupId?: string // JATOS group ID (optional, for future use)
}

/**
 * Diagnostic metadata extracted from values before stringification.
 * Only needed for variable-level diagnostics, not core observation data.
 */
export interface ValueDiagnosticMetadata {
  length: number // String length or array length
  stringValue?: string // Actual string value (for distinct tracking, only if string type)
  arrayElementInfo?: { kind: "uniform"; type: ValueType } | { kind: "mixed" }
  // undefined = not computed (empty array or non-array)
  arrayStringValues?: string[] // Array of string values (for distinct options, only if array of strings, limited)
  stringifyError?: "circular" | "stringify_error" // Error type if stringify failed
}

export interface ExtractionObservation {
  variableKey: string // wildcarded path with $ prefix, e.g. $trials[*].rt
  path: string // exact path, e.g. $trials[0].rt
  keyPath: string[] // structural breadcrumb: sequence of object keys and [*] for arrays, e.g. ["trials", "*", "stimulus", "color"] for trials[3].stimulus.color
  valueType: ValueType
  valueJson: string // JSON.stringify(value)
  rowKey: RowKeyEntry[] // Structural identity for array instances: which instance in which array nesting, e.g. [{ arrayKey: "trials[*]", index: 0 }, { arrayKey: "trials[*].responses[*]", index: 2 }]
  rowKeyId: string // String representation of rowKey for efficient joining: "trials[*]#0|trials[*].responses[*]#2" or "root" for non-array values
  scopeKeys: ScopeKeys // Execution context keys (componentId, and optionally studyResultId, workerId, batchId, groupId from JATOS)
  depth: number // Nesting depth (0 = root level)
  diagnosticMetadata?: ValueDiagnosticMetadata // Optional metadata for variable diagnostics (extracted before stringification)
  // Pre-computed derived values for efficient diagnostics
  scopeKeyId: string // Pre-computed from scopeKeys (used for invariants/metrics)
  keyPathString: string // Pre-computed from keyPath (JSON-encoded segments joined by ".", used for collisions)
  hasArrayIndices: boolean // Pre-computed from path (used for rowKey anomalies)
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
  | "CROSS_RUN_TRUNCATED_EXTRACTION"
  | "CROSS_RUN_COMPONENT_MISSING"
  | "CROSS_RUN_COMPONENT_FORMAT_MISMATCH"
  | "CROSS_RUN_VARIABLE_MISSING"
  | "CROSS_RUN_VARIABLE_TYPE_DRIFT"
  | "CROSS_RUN_VARIABLE_NULL_ONLY"

// Metadata structures for different diagnostic types
export interface DiagnosticMetadata {
  // Common fields
  variable?: string // variableKey for variable-level diagnostics
  componentId?: number // Component ID for component-level diagnostics
  count?: number // Count of occurrences/issues
  threshold?: number // Threshold value that was exceeded
  observationCount?: number // Number of observations
  nullRate?: number // Null rate (0-1)
  nullCount?: number // Number of null values
  totalCount?: number // Total count of values
  distinctCount?: number // Number of distinct values
  maxLength?: number // Maximum length
  depth?: number // Nesting depth
  nodeCount?: number // Number of nodes visited
  runCount?: number // Number of runs compared
  presentRunCount?: number // Number of iterations where item appears
  missingRunCount?: number // Number of iterations where item is missing
  runIds?: number[] // Run IDs involved
  missingRunIds?: number[] // Run IDs missing the item
  formats?: string[] // Formats seen across runs
  typesByRun?: Record<string, string[]> // Per-run types (stringified runId -> types)
  nullRatesByRun?: Record<string, number> // Per-run null rates (stringified runId -> rate)

  // Component-level diagnostic fields
  format?: string // Data format (json, csv, tsv, text, etc.)
  error?: string // Error message for PARSE_ERROR

  // Type-specific fields
  types?: Record<string, number> // Type counts for TYPE_DRIFT
  examplePaths?: string[] // Example paths for TYPE_DRIFT, SKIPPED_NON_JSON_TYPE
  jsType?: string // JavaScript type for SKIPPED_NON_JSON_TYPE
  tag?: string // Tag for SKIPPED_NON_JSON_TYPE
  firstKeyPathString?: string // First keyPath for VARIABLE_KEY_COLLISION
  currentKeyPathString?: string // Current keyPath for VARIABLE_KEY_COLLISION
  example?: // Example observation/issue
  | { scopeKeyId: string; rowKeyId: string; path: string } // For DUPLICATE_OBSERVATION
    | { rowKeyId: string; path: string } // For ROW_KEY_ID_ANOMALY
}

export interface Diagnostic {
  severity: DiagnosticSeverity
  code: DiagnosticCode
  message: string
  metadata?: DiagnosticMetadata
}

export interface ExtractionStats {
  nodeCount: number
  observationCount: number
  maxDepth: number
}

export interface NewExtractionResult {
  observations: ExtractionObservation[]
  componentDiagnostics: Map<number, Diagnostic[]> // keyed by componentId
  runDiagnostics: Diagnostic[]
  stats: ExtractionStats
  variableFacts: VariableFacts // Snapshot of variable facts (immutable data for aggregation)
  componentFacts: ComponentFacts // Snapshot of component facts (immutable data for diagnostics)
  crossRunDiagnostics?: CrossRunDiagnostics
}

export interface CrossRunDiagnostics {
  run: Diagnostic[]
  component: Map<number, Diagnostic[]>
  variable: Map<string, Diagnostic[]>
}

export interface VariableExample {
  value: string // JSON.stringify(value) from the observation
  sourcePath: string // The exact path where this example value was found (e.g., "trials[0].rt")
}

// Extract variable flags from DiagnosticCode (subset of diagnostic codes that are used as flags)
export type VariableFlag = Extract<
  DiagnosticCode,
  | "TYPE_DRIFT"
  | "MANY_NULLS"
  | "MIXED_ARRAY_ELEMENT_TYPES"
  | "HIGH_OCCURRENCE"
  | "HIGH_CARDINALITY"
  | "LARGE_VALUES"
>

export type VariableHeuristicThresholds = {
  manyNulls: number
  highNullRate: number
  highOccurrence: number
  highCardinality: number
  largeValueLength: number
}

/**
 * Complete extraction configuration with all thresholds and limits.
 * Single source of truth for all configurable values in the pipeline.
 */
export interface ExtractionConfig {
  // Walker limits (guardrails for traversal)
  walker: {
    maxDepth: number
    maxNodes: number
    maxObservations: number
  }
  // Run-level diagnostics thresholds
  run: {
    deepNestingThreshold: number
    maxExamplePaths: number
  }
  // Variable-level diagnostics thresholds
  variable: {
    maxExamplePaths: number
    maxDistinctTracking: number
  }
  // Variable heuristic thresholds (for materialization)
  heuristics: VariableHeuristicThresholds
}

/**
 * Default extraction configuration.
 * All components should use this unless overridden.
 */
export const DEFAULT_EXTRACTION_CONFIG: ExtractionConfig = {
  walker: {
    maxDepth: 10,
    maxNodes: 10000,
    maxObservations: 50000,
  },
  run: {
    deepNestingThreshold: 8,
    maxExamplePaths: 3,
  },
  variable: {
    maxExamplePaths: 3,
    maxDistinctTracking: 100,
  },
  heuristics: {
    manyNulls: 0.2, // 20%
    highNullRate: 0.8, // 80%
    highOccurrence: 10000,
    highCardinality: 100,
    largeValueLength: 5000,
  },
}

export interface ExtractedVariable {
  variableKey: string // Structural variable key with $ prefix, e.g. $trials[*].rt
  variableName: string // Human-readable prettified name without quotes and root, e.g. "rt" or "Quality: easy to use"
  examples: VariableExample[] // Array of examples, each with value and sourcePath from the same observation
  type: VariableType // Final variable type for consumers
  occurrences: number
  dataStructure: "array" | "object"
  componentIds: number[] // Component IDs where this variable was found
  runIds: number[] // JATOS Study Result IDs (Runs) where this variable was found
  flags: VariableFlag[] // Diagnostic flags for this variable
  depth: number // Nesting depth (0 = root level)
  // Extraction context
  isTopLevel: boolean // Is this a top-level key?
  diagnostics?: Diagnostic[] // Variable-level diagnostics (materialized from facts and computed from counts)
}

export interface ExtractionBundle {
  variables: ExtractedVariable[]
  observations: ExtractionObservation[]
  diagnostics: {
    run: Diagnostic[]
    component: Map<number, Diagnostic[]>
    variable: Map<string, { variableName: string; diagnostics: Diagnostic[] }>
    crossRun?: {
      run: Diagnostic[]
      component: Map<number, Diagnostic[]>
      variable: Map<string, { variableName: string; diagnostics: Diagnostic[] }>
    }
  }
}
