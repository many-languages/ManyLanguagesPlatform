import type { EnrichedJatosStudyResult } from "@/src/types/jatos"
import type { Diagnostic, ExtractionBundle, ExtractionConfig } from "../types"
import { DEFAULT_EXTRACTION_CONFIG } from "../types"
import { aggregateVariables } from "./aggregateVariables"
import { extractObservations } from "./extractObservations"

/**
 * Extract variables from enriched JATOS result
 * Orchestrates observation extraction and variable aggregation
 * Returns high-level variable aggregates
 */
/**
 * Extract variables + observations into a single bundle (for view materialization)
 */
export function extractVariableBundle(
  enrichedResult: EnrichedJatosStudyResult,
  config: ExtractionConfig = DEFAULT_EXTRACTION_CONFIG,
  options?: {
    diagnostics?: boolean
  }
): ExtractionBundle {
  // First, extract observations
  const extractionResult = extractObservations(enrichedResult, config, options)

  // Then, aggregate observations into variables
  const variables = aggregateVariables(
    extractionResult.observations,
    extractionResult.variableFacts,
    config,
    options
  )

  const variableDiagnostics = new Map<string, { variableName: string; diagnostics: Diagnostic[] }>()
  for (const variable of variables) {
    if (variable.diagnostics && variable.diagnostics.length > 0) {
      variableDiagnostics.set(variable.variableKey, {
        variableName: variable.variableName,
        diagnostics: variable.diagnostics,
      })
    }
  }

  return {
    variables,
    observations: extractionResult.observations,
    diagnostics: {
      run: extractionResult.runDiagnostics,
      component: extractionResult.componentDiagnostics,
      variable: variableDiagnostics,
    },
  }
}
