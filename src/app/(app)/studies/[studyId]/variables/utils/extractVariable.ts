import type { EnrichedJatosStudyResult } from "@/src/types/jatos"
import type {
  NewExtractionResult,
  ExtractionResult,
  Diagnostic,
  ExtractionObservation,
  ExtractedVariable,
  VariableFlag,
  VariableType,
  ValueType,
  VariableExample,
} from "../types"
import { walk } from "./walker"

/**
 * Transform CSV array-of-objects to object-of-arrays for unified extraction
 * [{col1: v1, col2: v2}, {col1: v3, col2: v4}] -> {col1: [v1, v3], col2: [v2, v4]}
 */
function transformCsvToObject(parsedData: any[]): Record<string, any[]> | null {
  if (!Array.isArray(parsedData) || parsedData.length === 0) {
    return null
  }

  const firstRow = parsedData[0]
  if (typeof firstRow !== "object" || firstRow === null) {
    return null
  }

  const columnNames = Object.keys(firstRow)
  if (columnNames.length === 0) {
    return null
  }

  // Transform: [{col1: v1, col2: v2}, ...] -> {col1: [v1, ...], col2: [v2, ...]}
  const transformedData: Record<string, any[]> = {}
  columnNames.forEach((colName) => {
    transformedData[colName] = parsedData
      .map((row) => row?.[colName])
      .filter((val) => val !== undefined)
  })

  return transformedData
}

/**
 * Extract observations from enriched JATOS result
 * Uses new walker-based extraction system
 * Returns observations, diagnostics, and stats
 */
export function extractObservations(enrichedResult: EnrichedJatosStudyResult): NewExtractionResult {
  const allObservations: NewExtractionResult["observations"] = []
  const allDiagnostics: Diagnostic[] = []
  const allStats: NewExtractionResult["stats"] = {
    nodeCount: 0,
    observationCount: 0,
    maxDepth: 0,
  }

  enrichedResult.componentResults.forEach((component) => {
    if (!component.parsedData && !component.dataContent) return

    const componentId = component.componentId

    // Check for parse errors
    if (component.parseError) {
      allDiagnostics.push({
        severity: "error",
        code: "PARSE_ERROR",
        message: `Parse error: ${component.parseError}`,
        metadata: {
          componentId,
          error: component.parseError,
        },
      })
      return
    }

    const format = component.detectedFormat?.format
    const parsedData = component.parsedData

    // Handle different formats
    if (format === "csv" || format === "tsv") {
      // CSV/TSV: Transform to object structure, then walk
      if (Array.isArray(parsedData)) {
        const transformedData = transformCsvToObject(parsedData)
        if (transformedData) {
          const result = walk(transformedData, { componentId })
          allObservations.push(...result.observations)
          allDiagnostics.push(...result.diagnostics)
          // Merge stats
          allStats.nodeCount += result.stats.nodeCount
          allStats.observationCount += result.stats.observationCount
          allStats.maxDepth = Math.max(allStats.maxDepth, result.stats.maxDepth)
        } else {
          allDiagnostics.push({
            severity: "warning",
            code: "UNKNOWN_FORMAT",
            message: "CSV/TSV data is empty, invalid, or has no columns",
            metadata: { componentId, format },
          })
        }
      } else {
        allDiagnostics.push({
          severity: "warning",
          code: "UNKNOWN_FORMAT",
          message: "CSV/TSV data is not an array after parsing",
          metadata: { componentId, format },
        })
      }
    } else if (format === "json") {
      // JSON: Walk the parsed data directly
      if (parsedData !== undefined && parsedData !== null) {
        const result = walk(parsedData, { componentId })
        allObservations.push(...result.observations)
        allDiagnostics.push(...result.diagnostics)
        // Merge stats
        allStats.nodeCount += result.stats.nodeCount
        allStats.observationCount += result.stats.observationCount
        allStats.maxDepth = Math.max(allStats.maxDepth, result.stats.maxDepth)
      } else {
        allDiagnostics.push({
          severity: "warning",
          code: "UNKNOWN_FORMAT",
          message: "JSON data is null or undefined",
          metadata: { componentId, format },
        })
      }
    } else if (format === "text") {
      // Text: Cannot process, add diagnostic
      allDiagnostics.push({
        severity: "error",
        code: "TEXT_FORMAT_NOT_SUPPORTED",
        message:
          "Text format data cannot be processed for variable extraction - data is unstructured",
        metadata: { componentId, format },
      })
    } else {
      // Unknown format
      allDiagnostics.push({
        severity: "warning",
        code: "UNKNOWN_FORMAT",
        message: `Unknown format: ${format || "undefined"}`,
        metadata: { componentId, format },
      })
    }
  })

  return {
    observations: allObservations,
    diagnostics: allDiagnostics,
    stats: allStats,
  }
}

// Thresholds for flag calculation
const THRESHOLDS = {
  NULL_RATE: 0.2, // 20%
  HIGH_OCCURRENCE: 10000,
  HIGH_CARDINALITY: 100, // distinct string/option count
  LARGE_VALUE_LENGTH: 5000,
  MAX_DISTINCT_TRACKING: 100, // Cap for distinct counting
} as const

/**
 * Compute stats for a variable from its observations
 */
function computeVariableStats(observations: ExtractionObservation[]) {
  const stats = {
    observationCount: observations.length,
    types: {
      null: 0,
      boolean: 0,
      number: 0,
      string: 0,
      array: 0,
      object: 0,
    } as Record<ValueType, number>,
    nullCount: 0,
    minLength: undefined as number | undefined,
    maxLength: undefined as number | undefined,
    distinctStringCount: 0,
    distinctOptionCount: 0,
    hasMixedArrayElements: false,
  }

  const distinctStrings = new Set<string>()
  const distinctOptions = new Set<string>()

  for (const obs of observations) {
    // Count types
    stats.types[obs.valueType]++

    // Count nulls
    if (obs.valueType === "null") {
      stats.nullCount++
    }

    // Track lengths and distinct values
    try {
      const parsed = JSON.parse(obs.valueJson)

      if (obs.valueType === "string") {
        const length = String(parsed).length
        stats.minLength = stats.minLength !== undefined ? Math.min(stats.minLength, length) : length
        stats.maxLength = stats.maxLength !== undefined ? Math.max(stats.maxLength, length) : length

        // Track distinct strings (capped)
        if (distinctStrings.size < THRESHOLDS.MAX_DISTINCT_TRACKING) {
          distinctStrings.add(parsed)
        }
      } else if (obs.valueType === "array" && Array.isArray(parsed)) {
        const length = parsed.length
        stats.minLength = stats.minLength !== undefined ? Math.min(stats.minLength, length) : length
        stats.maxLength = stats.maxLength !== undefined ? Math.max(stats.maxLength, length) : length

        // Check for array-of-string and track distinct options
        if (parsed.length > 0) {
          const firstType = typeof parsed[0]
          const allSameType = parsed.every((item) => typeof item === firstType)

          if (allSameType && firstType === "string") {
            // Array-of-string: track distinct options (capped)
            if (distinctOptions.size < THRESHOLDS.MAX_DISTINCT_TRACKING) {
              for (const item of parsed) {
                if (typeof item === "string") {
                  distinctOptions.add(item)
                  if (distinctOptions.size >= THRESHOLDS.MAX_DISTINCT_TRACKING) {
                    break
                  }
                }
              }
            }
          } else if (allSameType && firstType !== "object") {
            // Array-of-primitives with mixed types
            stats.hasMixedArrayElements = true
          }
        }
      }
    } catch {
      // Ignore parse errors
    }
  }

  stats.distinctStringCount = distinctStrings.size
  stats.distinctOptionCount = distinctOptions.size

  return stats
}

/**
 * Determine VariableType from ValueType counts
 */
function determineVariableType(types: Record<ValueType, number>): VariableType {
  // Remove null from consideration
  const { null: _, ...nonNullTypes } = types

  const presentTypes = Object.entries(nonNullTypes)
    .filter(([_, count]) => count > 0)
    .map(([type]) => type as ValueType)

  if (presentTypes.length === 0) {
    return "string" // Default fallback
  }

  if (presentTypes.length === 1) {
    const singleType = presentTypes[0]
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

/**
 * Calculate flags for a variable based on stats and global diagnostics
 */
function calculateFlags(
  stats: ReturnType<typeof computeVariableStats>,
  variableType: VariableType,
  globalDiagnostics: Diagnostic[]
): VariableFlag[] {
  const flags: VariableFlag[] = []

  // TYPE_DRIFT: Multiple VariableType observed
  const nonNullTypes = Object.entries(stats.types)
    .filter(([type, count]) => type !== "null" && count > 0)
    .map(([type]) => type)

  if (nonNullTypes.length > 1) {
    flags.push("TYPE_DRIFT")
  }

  // MANY_NULLS: Null rate above threshold
  if (stats.observationCount > 0) {
    const nullRate = stats.nullCount / stats.observationCount
    if (nullRate >= THRESHOLDS.NULL_RATE) {
      flags.push("MANY_NULLS")
    }
  }

  // MIXED_ARRAY_ELEMENT_TYPES: Array with mixed element types
  if (stats.hasMixedArrayElements) {
    flags.push("MIXED_ARRAY_ELEMENT_TYPES")
  }

  // HIGH_OCCURRENCE: Too many observations
  if (stats.observationCount > THRESHOLDS.HIGH_OCCURRENCE) {
    flags.push("HIGH_OCCURRENCE")
  }

  // HIGH_CARDINALITY: Too many distinct values
  if (variableType === "string" && stats.distinctStringCount >= THRESHOLDS.HIGH_CARDINALITY) {
    flags.push("HIGH_CARDINALITY")
  } else if (variableType === "array" && stats.distinctOptionCount >= THRESHOLDS.HIGH_CARDINALITY) {
    flags.push("HIGH_CARDINALITY")
  }

  // LARGE_VALUES: Very long strings or arrays
  if (stats.maxLength !== undefined && stats.maxLength > THRESHOLDS.LARGE_VALUE_LENGTH) {
    flags.push("LARGE_VALUES")
  }

  // TRUNCATED_EXTRACTION: Check global diagnostics
  const truncationCodes = ["MAX_NODES_EXCEEDED", "MAX_OBSERVATIONS_EXCEEDED", "MAX_DEPTH_EXCEEDED"]
  const hasTruncation = globalDiagnostics.some((d) => truncationCodes.includes(d.code))
  if (hasTruncation) {
    flags.push("TRUNCATED_EXTRACTION")
  }

  return flags
}

/**
 * Aggregate observations into high-level variable aggregates
 */
export function aggregateVariables(extractionResult: NewExtractionResult): ExtractedVariable[] {
  // Group observations by variable name
  const variableMap = new Map<string, ExtractionObservation[]>()

  for (const obs of extractionResult.observations) {
    if (!variableMap.has(obs.variable)) {
      variableMap.set(obs.variable, [])
    }
    variableMap.get(obs.variable)!.push(obs)
  }

  // Convert to ExtractedVariable array
  return Array.from(variableMap.entries()).map(([variableName, observations]) => {
    // Compute stats on-the-fly
    const stats = computeVariableStats(observations)

    // Determine variable type
    const variableType = determineVariableType(stats.types)

    // Calculate flags
    const flags = calculateFlags(stats, variableType, extractionResult.diagnostics)

    // Get examples (first few observations)
    const examples: VariableExample[] = observations.slice(0, 5).map((obs) => ({
      value: obs.valueJson,
      sourcePath: obs.path,
    }))

    // Collect all values
    const allValues = observations.map((obs) => {
      try {
        return JSON.parse(obs.valueJson)
      } catch {
        return null
      }
    })

    // Get unique component IDs
    const componentIds = Array.from(new Set(observations.map((obs) => obs.componentId)))

    // Determine data structure (simplified - could be enhanced)
    const dataStructure: "array" | "object" = observations.length > 1 ? "array" : "object"

    // Compute depth from observations (use minDepth as the variable depth)
    const depths = observations.map((obs) => obs.depth)
    const minDepth = Math.min(...depths)
    const maxDepth = Math.max(...depths)
    const depth = minDepth // Use minimum depth as the variable depth
    const isTopLevel = minDepth === 0 // Top level if at least one observation is at root

    return {
      variableName,
      examples,
      type: variableType,
      occurrences: stats.observationCount,
      dataStructure,
      allValues,
      componentIds,
      flags,
      depth,
      isTopLevel,
    }
  })
}

/**
 * Extract variables from enriched JATOS result
 * Orchestrates observation extraction and variable aggregation
 * Returns high-level variable aggregates
 */
export function extractVariables(enrichedResult: EnrichedJatosStudyResult): ExtractionResult {
  // First, extract observations
  const extractionResult = extractObservations(enrichedResult)

  // Then, aggregate observations into variables
  const variables = aggregateVariables(extractionResult)

  // Convert diagnostics to warnings (for non-skipped issues)
  const warnings = extractionResult.diagnostics
    .filter((d) => d.severity === "warning")
    .map((d) => d.message)

  return {
    variables,
    skippedValues: [], // TODO: map from diagnostics if needed
    warnings,
  }
}
