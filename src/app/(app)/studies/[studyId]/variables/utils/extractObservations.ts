import { EnrichedJatosStudyResult } from "@/src/types/jatos"
import {
  DEFAULT_EXTRACTION_CONFIG,
  ExtractionConfig,
  NewExtractionResult,
  DiagnosticCode,
} from "../types"
import { ComponentFactsCollector } from "./componentFactsCollector"
import { RunFactsCollector } from "./runFactsCollector"
import { StatsTracker } from "./statsTracker"
import { transformCsvToObject } from "./transformCsvToObject"
import { walk, type PipelineContext } from "./walker"
import { VariableFactsCollector } from "./variableFactsCollector"
import { freezeVariableFacts } from "./freezeVariableFacts"
import { freezeRunFacts } from "./freezeRunFacts"
import { freezeComponentFacts } from "./freezeComponentFacts"
import { materializeRunDiagnostics } from "./materializeRunDiagnostics"
import { materializeComponentDiagnostics } from "./materializeComponentDiagnostics"

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
  const componentFactsCollector = new ComponentFactsCollector()

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
    const format = component.detectedFormat?.format

    componentFactsCollector.recordComponent({
      componentId,
      detectedFormat: format,
      hasParsedData: !!component.parsedData,
      hasDataContent: !!component.dataContent,
    })

    // Early validation: empty data
    if (!component.parsedData && !component.dataContent) {
      return
    }

    // Early validation: parse errors
    if (component.parseError) {
      componentFactsCollector.recordParseError(componentId, component.parseError)
      return
    }

    // Prepare data for walking (format-specific transformation)
    const prepared = prepareDataForWalking(format, component.parsedData)

    // Handle format-specific errors
    if ("error" in prepared) {
      componentFactsCollector.recordFormatError(
        componentId,
        prepared.error.code,
        prepared.error.message
      )
      return
    }

    // Walk the prepared data
    const scopeKeys = { componentId }
    const result = walk(prepared.data, scopeKeys, ctx)

    allObservations.push(...result.observations)
  })

  // Freeze facts into immutable snapshots
  const variableFacts = freezeVariableFacts(variableFactsCollector)
  const componentFacts = freezeComponentFacts(componentFactsCollector)

  // Materialize diagnostics from frozen facts (only if enabled)
  const runDiagnostics = diagnosticsEnabled
    ? materializeRunDiagnostics(freezeRunFacts(runFactsCollector))
    : []
  const componentDiagnostics = diagnosticsEnabled
    ? materializeComponentDiagnostics(componentFacts)
    : new Map()

  return {
    observations: allObservations,
    componentDiagnostics,
    runDiagnostics,
    stats: statsTracker.getStats(),
    variableFacts,
    componentFacts,
  }
}
