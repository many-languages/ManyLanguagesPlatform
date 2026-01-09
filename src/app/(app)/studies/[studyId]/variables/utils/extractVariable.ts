import type { EnrichedJatosStudyResult } from "@/src/types/jatos"
import type { ExtractionResult } from "../types"
import { aggregateVariables } from "./aggregateVariables"
import { extractObservations } from "./extractObservations"

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

  return {
    variables,
    skippedValues: [], // TODO: map from diagnostics if needed
    componentDiagnostics: extractionResult.componentDiagnostics,
    runDiagnostics: extractionResult.runDiagnostics,
  }
}
