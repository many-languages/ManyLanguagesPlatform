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
  const extractionResult = extractObservations([enrichedResult], config, options)

  // Then, aggregate observations into variables
  const variables = aggregateVariables(
    extractionResult.observations,
    extractionResult.variableFacts,
    config,
    options
  )

  return {
    variables,
    observations: extractionResult.observations,
    diagnostics: buildVariableDiagnostics(variables, extractionResult),
  }
}

export function extractVariableBundleFromResults(
  enrichedResults: EnrichedJatosStudyResult[],
  config: ExtractionConfig = DEFAULT_EXTRACTION_CONFIG,
  options?: {
    diagnostics?: boolean
  }
): ExtractionBundle {
  if (enrichedResults.length === 0) {
    return {
      variables: [],
      observations: [],
      diagnostics: {
        run: [],
        component: new Map(),
        variable: new Map(),
      },
    }
  }

  const extractionResult = extractObservations(enrichedResults, config, options)

  const variables = aggregateVariables(
    extractionResult.observations,
    extractionResult.variableFacts,
    config,
    options
  )

  return {
    variables,
    observations: extractionResult.observations,
    diagnostics: buildVariableDiagnostics(variables, extractionResult),
  }
}

function buildVariableDiagnostics(
  variables: ExtractionBundle["variables"],
  extractionResult: ReturnType<typeof extractObservations>
): ExtractionBundle["diagnostics"] {
  const variableDiagnostics = new Map<string, { variableName: string; diagnostics: Diagnostic[] }>()
  for (const variable of variables) {
    if (variable.diagnostics && variable.diagnostics.length > 0) {
      variableDiagnostics.set(variable.variableKey, {
        variableName: variable.variableName,
        diagnostics: variable.diagnostics,
      })
    }
  }

  const variableNameByKey = new Map<string, string>()
  for (const variable of variables) {
    variableNameByKey.set(variable.variableKey, variable.variableName)
  }

  let crossRun:
    | {
        run: Diagnostic[]
        component: Map<number, Diagnostic[]>
        variable: Map<string, { variableName: string; diagnostics: Diagnostic[] }>
      }
    | undefined

  if (extractionResult.crossRunDiagnostics) {
    const crossRunVariableDiagnostics = new Map<
      string,
      { variableName: string; diagnostics: Diagnostic[] }
    >()
    for (const [variableKey, diags] of extractionResult.crossRunDiagnostics.variable.entries()) {
      const variableName = variableNameByKey.get(variableKey) ?? variableKey
      crossRunVariableDiagnostics.set(variableKey, {
        variableName,
        diagnostics: diags,
      })
    }

    crossRun = {
      run: extractionResult.crossRunDiagnostics.run,
      component: extractionResult.crossRunDiagnostics.component,
      variable: crossRunVariableDiagnostics,
    }
  }

  return {
    run: extractionResult.runDiagnostics,
    component: extractionResult.componentDiagnostics,
    variable: variableDiagnostics,
    crossRun,
  }
}

/**
 * Extract only the observations and variable aggregates needed for rendering.
 * Diagnostics are disabled and observations are allowlisted by variable key.
 */
export function extractVariableBundleForRender(
  enrichedResult: EnrichedJatosStudyResult,
  requiredVariableKeys?: Set<string>,
  config: ExtractionConfig = DEFAULT_EXTRACTION_CONFIG
): Pick<ExtractionBundle, "variables" | "observations"> {
  const extractionResult = extractObservations([enrichedResult], config, {
    diagnostics: false,
    allowVariableKeys: requiredVariableKeys,
  })

  const variables = aggregateVariables(
    extractionResult.observations,
    extractionResult.variableFacts,
    config,
    { diagnostics: false }
  )

  return {
    variables,
    observations: extractionResult.observations,
  }
}

/**
 * Extract only the observations and variable aggregates needed for rendering
 * across multiple results.
 */
export function extractVariableBundleForRenderFromResults(
  enrichedResults: EnrichedJatosStudyResult[],
  requiredVariableKeys?: Set<string>,
  config: ExtractionConfig = DEFAULT_EXTRACTION_CONFIG
): Pick<ExtractionBundle, "variables" | "observations"> {
  if (enrichedResults.length === 0) {
    return { variables: [], observations: [] }
  }

  const extractionResult = extractObservations(enrichedResults, config, {
    diagnostics: false,
    allowVariableKeys: requiredVariableKeys,
  })

  const variables = aggregateVariables(
    extractionResult.observations,
    extractionResult.variableFacts,
    config,
    { diagnostics: false }
  )

  return {
    variables,
    observations: extractionResult.observations,
  }
}
