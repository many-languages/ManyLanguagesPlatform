import type { EnrichedJatosStudyResult } from "@/src/types/jatos"
import type { ExtractionConfig, ExtractionResult } from "../types"
import { DEFAULT_EXTRACTION_CONFIG } from "../types"
import { aggregateVariables } from "./aggregateVariables"
import { extractObservations } from "./extractObservations"

/**
 * Extract variables from enriched JATOS result
 * Orchestrates observation extraction and variable aggregation
 * Returns high-level variable aggregates
 */
export function extractVariables(
  enrichedResult: EnrichedJatosStudyResult,
  config: ExtractionConfig = DEFAULT_EXTRACTION_CONFIG
): ExtractionResult {
  // First, extract observations
  const extractionResult = extractObservations(enrichedResult, config)

  // Then, aggregate observations into variables
  const variables = aggregateVariables(
    extractionResult.observations,
    extractionResult.variableFacts,
    config
  )

  return {
    variables,
    componentDiagnostics: extractionResult.componentDiagnostics,
    runDiagnostics: extractionResult.runDiagnostics,
  }
}
