import {
  ExtractedVariable,
  NewExtractionResult,
  VariableExample,
  VariableHeuristicThresholds,
} from "../types"
import { buildVariableNames } from "./buildVariableNames"
import { deriveVariableFlags, materializeVariableDiagnostics } from "./diagnostics"
import { determineVariableType } from "./determineVariableType"

/**
 * Aggregate observations into high-level variable aggregates
 * Lightweight: only stores metadata and examples, not all values
 */
export function aggregateVariables(extractionResult: NewExtractionResult): ExtractedVariable[] {
  // Track variable metadata as we iterate (no storage of observation arrays)
  const variableMetadata = new Map<
    string,
    {
      keyPath: string[]
      componentIds: Set<number>
      depths: number[]
      examples: VariableExample[]
    }
  >()

  // Single pass through observations to collect metadata
  for (const obs of extractionResult.observations) {
    if (!variableMetadata.has(obs.variableKey)) {
      variableMetadata.set(obs.variableKey, {
        keyPath: obs.keyPath,
        componentIds: new Set(),
        depths: [],
        examples: [],
      })
    }

    const meta = variableMetadata.get(obs.variableKey)!
    meta.componentIds.add(obs.scopeKeys.componentId)
    meta.depths.push(obs.depth)

    // Collect examples (first 5 only)
    if (meta.examples.length < 5) {
      meta.examples.push({
        value: obs.valueJson,
        sourcePath: obs.path,
      })
    }
  }

  // Build keyPath map for variable name generation
  const variableKeyPaths = new Map<string, string[]>()
  for (const [variableKey, meta] of variableMetadata.entries()) {
    variableKeyPaths.set(variableKey, meta.keyPath)
  }

  // Generate prettified variable names
  const variableNames = buildVariableNames(variableKeyPaths)

  // Get facts from the single DiagnosticEngine
  const facts = extractionResult.diagnosticEngine.getVariableFacts()

  // Centralized thresholds configuration
  const thresholds: VariableHeuristicThresholds = {
    manyNulls: 0.2, // 20%
    highNullRate: 0.8, // 80%
    highOccurrence: 10000,
    highCardinality: 100,
    largeValueLength: 5000,
  }

  // Convert to ExtractedVariable array
  const variables: ExtractedVariable[] = []
  for (const [variableKey, meta] of variableMetadata.entries()) {
    // Determine variable type from facts
    const variableType = determineVariableType(variableKey, facts.types.variableTypes)

    // Get unique component IDs
    const componentIds = Array.from(meta.componentIds)

    // Get observation count from facts
    const observationCount = facts.counts.variableCounts.get(variableKey) || 0

    // Determine data structure (simplified - could be enhanced)
    const dataStructure: "array" | "object" = observationCount > 1 ? "array" : "object"

    // Compute depth from observations (use minDepth as the variable depth)
    const minDepth = Math.min(...meta.depths)
    const depth = minDepth // Use minimum depth as the variable depth
    const isTopLevel = minDepth === 0 // Top level if at least one observation is at root

    // Materialize variable-level diagnostics from facts (single source of truth)
    const materializedDiagnostics = materializeVariableDiagnostics(
      variableKey,
      facts,
      variableType,
      thresholds
    )

    // Derive flags from diagnostics (projection for quick filtering)
    const flags = deriveVariableFlags(materializedDiagnostics)

    variables.push({
      variableKey,
      variableName: variableNames.get(variableKey) || variableKey,
      examples: meta.examples,
      type: variableType,
      occurrences: observationCount,
      dataStructure,
      componentIds,
      flags,
      depth,
      isTopLevel,
      diagnostics: materializedDiagnostics.length > 0 ? materializedDiagnostics : undefined,
    })
  }

  return variables
}
