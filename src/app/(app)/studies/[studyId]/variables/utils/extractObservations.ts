import { EnrichedJatosStudyResult } from "@/src/types/jatos"
import {
  DEFAULT_EXTRACTION_CONFIG,
  ExtractionConfig,
  NewExtractionResult,
  DiagnosticCode,
} from "../types"
import { ComponentDiagnosticsCollector } from "./componentDiagnosticsCollector"
import { RunFactsCollector } from "./runFactsCollector"
import { StatsTracker } from "./statsTracker"
import { transformCsvToObject } from "./transformCsvToObject"
import { walk, type PipelineContext } from "./walker"
import { VariableFactsCollector } from "./variableFactsCollector"
import { freezeVariableFacts } from "./freezeVariableFacts"
import { freezeRunFacts } from "./freezeRunFacts"
import { materializeRunDiagnostics } from "./materializeRunDiagnostics"

/**
 * Format-specific data preparation
 * Returns either data ready for walking or an error
 */
function prepareDataForWalking(
  format: string | undefined,
  parsedData: any
): { data: any } | { error: { code: DiagnosticCode; message: string } } {
  if (format === "csv" || format === "tsv") {
    if (!Array.isArray(parsedData)) {
      return {
        error: {
          code: "UNKNOWN_FORMAT",
          message: "CSV/TSV data is not an array after parsing",
        },
      }
    }

    const transformedData = transformCsvToObject(parsedData)
    if (!transformedData) {
      return {
        error: {
          code: "EMPTY_OR_NO_DATA",
          message: "CSV/TSV data is empty, invalid, or has no columns",
        },
      }
    }

    return { data: transformedData }
  }

  if (format === "json") {
    if (parsedData === undefined || parsedData === null) {
      return {
        error: {
          code: "EMPTY_OR_NO_DATA",
          message: "JSON data is null or undefined",
        },
      }
    }

    return { data: parsedData }
  }

  if (format === "text") {
    return {
      error: {
        code: "TEXT_FORMAT_NOT_SUPPORTED",
        message:
          "Text format data cannot be processed for variable extraction - data is unstructured",
      },
    }
  }

  // Unknown format
  return {
    error: {
      code: "UNKNOWN_FORMAT",
      message: `Unknown format: ${format || "undefined"}`,
    },
  }
}

/**
 * Extract observations from enriched JATOS result
 * Orchestrates observation extraction across all components
 * Returns observations, diagnostics, and stats
 */
export function extractObservations(
  enrichedResult: EnrichedJatosStudyResult,
  config: ExtractionConfig = DEFAULT_EXTRACTION_CONFIG,
  options?: { diagnostics?: boolean }
): NewExtractionResult {
  const diagnosticsEnabled = options?.diagnostics ?? true
  const allObservations: NewExtractionResult["observations"] = []

  // Single collectors for all components (tracks stats and facts across all components)
  const statsTracker = new StatsTracker()
  const runFactsCollector = new RunFactsCollector({
    deepNestingThreshold: config.run.deepNestingThreshold,
    maxExamplePaths: config.run.maxExamplePaths,
    enabled: diagnosticsEnabled,
  })
  const variableFactsCollector = new VariableFactsCollector({
    maxExamplePaths: config.variable.maxExamplePaths,
    maxDistinctTracking: config.variable.maxDistinctTracking,
  })
  const componentDiagnosticsCollector = new ComponentDiagnosticsCollector()

  // Create pipeline context once (ensures consistency across all walks)
  const ctx: PipelineContext = {
    config,
    stats: statsTracker,
    run: runFactsCollector,
    variable: variableFactsCollector,
  }

  // Process each component
  enrichedResult.componentResults.forEach((component) => {
    const componentId = component.componentId

    // Early validation: empty data
    if (!component.parsedData && !component.dataContent) {
      if (diagnosticsEnabled) {
        componentDiagnosticsCollector.add(componentId, {
          severity: "warning",
          code: "EMPTY_OR_NO_DATA",
          message: `Component ${componentId} has no data or empty data`,
          metadata: { componentId },
        })
      }
      return
    }

    // Early validation: parse errors
    if (component.parseError) {
      if (diagnosticsEnabled) {
        componentDiagnosticsCollector.add(componentId, {
          severity: "error",
          code: "PARSE_ERROR",
          message: `Parse error: ${component.parseError}`,
          metadata: {
            componentId,
            error: component.parseError,
          },
        })
      }
      return
    }

    // Prepare data for walking (format-specific transformation)
    const format = component.detectedFormat?.format
    const prepared = prepareDataForWalking(format, component.parsedData)

    // Handle format-specific errors
    if ("error" in prepared) {
      const severity = prepared.error.code === "TEXT_FORMAT_NOT_SUPPORTED" ? "error" : "warning"
      if (diagnosticsEnabled) {
        componentDiagnosticsCollector.add(componentId, {
          severity,
          code: prepared.error.code,
          message: prepared.error.message,
          metadata: { componentId, format },
        })
      }
      return
    }

    // Walk the prepared data
    const scopeKeys = { componentId }
    const result = walk(prepared.data, scopeKeys, ctx)

    allObservations.push(...result.observations)
  })

  // Freeze facts into immutable snapshots
  const variableFacts = freezeVariableFacts(variableFactsCollector)

  // Materialize diagnostics from frozen facts (only if enabled)
  const runDiagnostics = diagnosticsEnabled
    ? materializeRunDiagnostics(freezeRunFacts(runFactsCollector))
    : []

  return {
    observations: allObservations,
    componentDiagnostics: componentDiagnosticsCollector.getComponentDiagnostics(),
    runDiagnostics,
    stats: statsTracker.getStats(),
    variableFacts,
  }
}
