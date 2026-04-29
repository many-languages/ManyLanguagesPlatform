import {
  ExtractionConfig,
  ExtractedVariable,
  ExtractionObservation,
  VariableFacts,
  VariableExample,
} from "../types"
import { buildVariableNames } from "./buildVariableNames"
import { deriveVariableFlags } from "./deriveVariableFlags"
import { determineVariableType } from "./determineVariableType"
import { materializeVariableDiagnostics } from "./materializeVariableDiagnostics"

/**
 * Aggregate observations into high-level variable aggregates
 * Lightweight: only stores metadata and examples, not all values
 * Takes only the data needed (observations and variableFacts) as direct parameters
 */
export function aggregateVariables(
  observations: ExtractionObservation[],
  variableFacts: VariableFacts,
  config: ExtractionConfig,
  options?: { diagnostics?: boolean }
): ExtractedVariable[] {
  const diagnosticsEnabled = options?.diagnostics ?? true
  // Track variable metadata and keyPath map as we iterate (no storage of observation arrays)
  const variableMetadata = new Map<
    string,
    {
      keyPath: string[]
      componentIds: Set<number>
      runIds: Set<number>
      minDepth: number
      examples: VariableExample[]
      count: number
    }
  >()
  const keyPathMap = new Map<string, string[]>()

  // Single pass through observations to collect metadata
  for (const obs of observations) {
    if (!variableMetadata.has(obs.variableKey)) {
      keyPathMap.set(obs.variableKey, obs.keyPath)
      variableMetadata.set(obs.variableKey, {
        keyPath: obs.keyPath,
        componentIds: new Set(),
        runIds: new Set(),
        minDepth: Infinity,
        examples: [],
        count: 0,
      })
    }

    const meta = variableMetadata.get(obs.variableKey)!
    meta.componentIds.add(obs.scopeKeys.componentId)
    if (obs.scopeKeys.studyResultId !== undefined) {
      meta.runIds.add(obs.scopeKeys.studyResultId)
    }
    meta.minDepth = Math.min(meta.minDepth, obs.depth)
    meta.count++

    // Collect examples (first 5 only)
    if (meta.examples.length < 5) {
      meta.examples.push({
        value: obs.valueJson,
        sourcePath: obs.path,
      })
    }
  }

  // Generate prettified variable names (keyPathMap already built during observation loop)
  const variableNames = buildVariableNames(keyPathMap)

  // Use variableFacts directly (already a snapshot, no engine dependency)
  const facts = variableFacts

  // Convert to ExtractedVariable array
  const variables: ExtractedVariable[] = []
  for (const [variableKey, meta] of variableMetadata.entries()) {
    // Determine variable type from facts
    const variableType = determineVariableType(variableKey, facts.types.variableTypes)

    // Get unique component IDs
    const componentIds = Array.from(meta.componentIds)

    // Get observation count directly from observations (source of truth, independent of diagnostics)
    const observationCount = meta.count

    // Determine data structure: check if variableKey contains [*] (array wildcard)
    // This correctly identifies array variables vs object variables based on structure
    const dataStructure: "array" | "object" = variableKey.includes("[*]") ? "array" : "object"

    // Use minDepth directly (already computed during observation loop)
    const depth = meta.minDepth
    const isTopLevel = meta.minDepth === 1 // Top-level keys are direct children of root (depth 1)

    // Materialize variable-level diagnostics from facts (single source of truth)
    // Use thresholds from config
    const materializedDiagnostics = diagnosticsEnabled
      ? materializeVariableDiagnostics(variableKey, facts, variableType, config.heuristics, {
          maxExamplePaths: config.variable.maxExamplePaths,
        })
      : []

    // Derive flags from diagnostics (projection for quick filtering)
    const flags = diagnosticsEnabled ? deriveVariableFlags(materializedDiagnostics) : []

    variables.push({
      variableKey,
      variableName: variableNames.get(variableKey) || variableKey,
      examples: meta.examples,
      type: variableType,
      occurrences: observationCount,
      dataStructure,
      componentIds,
      runIds: Array.from(meta.runIds),
      flags,
      depth,
      isTopLevel,
      diagnostics:
        diagnosticsEnabled && materializedDiagnostics.length > 0
          ? materializedDiagnostics
          : undefined,
    })
  }

  return variables
}
