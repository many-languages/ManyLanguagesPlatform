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
import { aggregateComponentFactsByRun, aggregateVariableFactsByRun } from "./aggregateFactsByRun"

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
  enrichedResults: EnrichedJatosStudyResult[],
  config: ExtractionConfig = DEFAULT_EXTRACTION_CONFIG,
  options?: { diagnostics?: boolean; allowVariableKeys?: Set<string> }
): NewExtractionResult {
  const diagnosticsEnabled = options?.diagnostics ?? true
  const allObservations: NewExtractionResult["observations"] = []

  // Shared stats tracker for global limits (unchanged behavior)
  const statsTracker = new StatsTracker()
  const runCollectorsByRun = new Map<number, RunFactsCollector>()
  const variableCollectorsByRun = new Map<number, VariableFactsCollector>()
  const componentCollectorsByRun = new Map<number, ComponentFactsCollector>()

  // Process each result + component
  enrichedResults.forEach((enrichedResult) => {
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

    runCollectorsByRun.set(enrichedResult.id, runFactsCollector)
    variableCollectorsByRun.set(enrichedResult.id, variableFactsCollector)
    componentCollectorsByRun.set(enrichedResult.id, componentFactsCollector)

    // Create pipeline context per run
    const ctx: PipelineContext = {
      config,
      stats: statsTracker,
      run: runFactsCollector,
      variable: variableFactsCollector,
      allowVariableKeys: options?.allowVariableKeys,
    }

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
      const scopeKeys = { componentId, studyResultId: enrichedResult.id }
      const result = walk(prepared.data, scopeKeys, ctx)

      allObservations.push(...result.observations)
    })
  })

  // Freeze facts into immutable snapshots
  const variableFactsByRun = new Map<number, ReturnType<typeof freezeVariableFacts>>()
  const componentFactsByRun = new Map<number, ReturnType<typeof freezeComponentFacts>>()
  const runFactsByRun = new Map<number, ReturnType<typeof freezeRunFacts>>()

  for (const [runId, collector] of variableCollectorsByRun.entries()) {
    variableFactsByRun.set(runId, freezeVariableFacts(collector))
  }
  for (const [runId, collector] of componentCollectorsByRun.entries()) {
    componentFactsByRun.set(runId, freezeComponentFacts(collector))
  }
  for (const [runId, collector] of runCollectorsByRun.entries()) {
    runFactsByRun.set(runId, freezeRunFacts(collector))
  }

  const variableFacts = aggregateVariableFactsByRun(variableFactsByRun, {
    maxExamplePaths: config.variable.maxExamplePaths,
    maxDistinctTracking: config.variable.maxDistinctTracking,
  })
  const componentFacts = aggregateComponentFactsByRun(componentFactsByRun)

  // Materialize diagnostics from frozen facts (only if enabled)
  const runDiagnostics = diagnosticsEnabled
    ? materializeRunDiagnostics(runFactsByRun, { maxExamplePaths: config.run.maxExamplePaths })
    : []
  const componentDiagnostics = diagnosticsEnabled
    ? materializeComponentDiagnostics(componentFactsByRun)
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
