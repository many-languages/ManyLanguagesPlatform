/**
 * Debug View Materializer
 * Computes all debug aggregates in a single pass over observations
 * Uses ExtractionIndexStore for fast lookups
 */

import type { ExtractionBundle, ValueType } from "../../variables/types"
import type { ExtractionIndexStore } from "../../variables/utils/extractionIndexStore"
import { identifyComponentPatterns, type DetectedPattern } from "./detectComponentPatterns"

export interface ComponentStructureAnalysis {
  componentId: number
  originalFormat?: string
  structureType: "array" | "object" | "primitive" | "null" | "empty"
  topLevelKeys: string[]
  topLevelKeyTypes: Map<string, "primitive" | "array" | "object">
  maxDepth: number
  totalKeys: number
  hasError?: boolean
  errorInfo?: { code: string; message: string }
}

export interface DebugStructureAnalysis {
  structureType: "array" | "object" | "mixed" | "empty"
  components: ComponentStructureAnalysis[]
  statistics: {
    totalComponents: number
    componentsWithData: number
    totalTopLevelGroups: number
    maxNestingDepth: number
    averageNestingDepth: number
  }
  patterns: DetectedPattern[]
}

export interface DebugViewMaterialized {
  structure: DebugStructureAnalysis
}

/**
 * Helper to infer structure type from value type
 */
function valueTypeToStructureType(valueType: ValueType): "primitive" | "array" | "object" {
  if (valueType === "array") return "array"
  if (valueType === "object") return "object"
  return "primitive"
}

/**
 * Materialize debug view aggregates from extraction bundle
 * Single pass over observations with fast index lookups
 */
export function materializeDebugView(
  extractionBundle: ExtractionBundle,
  indexStore: ExtractionIndexStore
): DebugViewMaterialized {
  const { observations, variables, diagnostics, componentFacts } = extractionBundle

  // Build component structure analysis using index store
  const components: ComponentStructureAnalysis[] = []

  for (const [componentId, facts] of componentFacts.entries()) {
    const componentDiags = diagnostics.component.get(componentId) || []
    const errorDiag = componentDiags.find((d) => d.severity === "error")
    const hasError = !!errorDiag

    // Get observations for this component from index
    const obsIndices = indexStore.getObservationIndicesByComponentId(componentId)

    // If no observations and has error, mark as error component
    if (obsIndices.length === 0 && hasError) {
      components.push({
        componentId,
        originalFormat: facts.detectedFormat,
        structureType: "null",
        topLevelKeys: [],
        topLevelKeyTypes: new Map(),
        maxDepth: 0,
        totalKeys: 0,
        hasError: true,
        errorInfo: errorDiag ? { code: errorDiag.code, message: errorDiag.message } : undefined,
      })
      continue
    }

    // If no observations and no error, mark as empty
    if (obsIndices.length === 0) {
      components.push({
        componentId,
        originalFormat: facts.detectedFormat,
        structureType: "empty",
        topLevelKeys: [],
        topLevelKeyTypes: new Map(),
        maxDepth: 0,
        totalKeys: 0,
      })
      continue
    }

    // Derive structure from observations
    let hasArrayStructure = false
    const topLevelKeysSet = new Set<string>()
    const topLevelKeyTypes = new Map<string, "primitive" | "array" | "object">()
    const uniqueVariableKeys = new Set<string>()
    let maxDepth = 0

    for (const idx of obsIndices) {
      const obs = observations[idx]

      // Check for array structure
      if (obs.variableKey.includes("[*]")) {
        hasArrayStructure = true
      }

      // Track max depth
      if (obs.depth > maxDepth) {
        maxDepth = obs.depth
      }

      // Track unique variable keys
      uniqueVariableKeys.add(obs.variableKey)

      // Collect top-level keys
      if (obs.keyPath.length > 0) {
        const topKey = obs.keyPath[0]
        if (topKey !== "*") {
          topLevelKeysSet.add(topKey)

          // Infer type from observation
          const currentType = valueTypeToStructureType(obs.valueType)
          const existingType = topLevelKeyTypes.get(topKey)

          // Prefer more complex types (object > array > primitive)
          if (!existingType) {
            topLevelKeyTypes.set(topKey, currentType)
          } else if (
            currentType === "object" ||
            (currentType === "array" && existingType === "primitive")
          ) {
            topLevelKeyTypes.set(topKey, currentType)
          }
        }
      }
    }

    // Determine structure type
    let structureType: "array" | "object" | "primitive"
    if (hasArrayStructure) {
      structureType = "array"
    } else if (topLevelKeysSet.size > 0) {
      structureType = "object"
    } else {
      structureType = "primitive"
    }

    components.push({
      componentId,
      originalFormat: facts.detectedFormat,
      structureType,
      topLevelKeys: Array.from(topLevelKeysSet),
      topLevelKeyTypes,
      maxDepth,
      totalKeys: uniqueVariableKeys.size,
      hasError,
      errorInfo: errorDiag ? { code: errorDiag.code, message: errorDiag.message } : undefined,
    })
  }

  // Calculate aggregated statistics
  const componentsWithData = components.filter(
    (c) => c.structureType !== "null" && c.structureType !== "empty"
  )

  // Aggregate top-level keys across all components
  const allTopLevelKeys = new Set<string>()
  componentsWithData.forEach((c) => {
    c.topLevelKeys.forEach((key) => allTopLevelKeys.add(key))
  })

  const maxNestingDepth = Math.max(...componentsWithData.map((c) => c.maxDepth), 0)
  const averageNestingDepth =
    componentsWithData.length > 0
      ? componentsWithData.reduce((sum, c) => sum + c.maxDepth, 0) / componentsWithData.length
      : 0

  const statistics = {
    totalComponents: componentFacts.size,
    componentsWithData: componentsWithData.length,
    totalTopLevelGroups: allTopLevelKeys.size,
    maxNestingDepth,
    averageNestingDepth,
  }

  // Determine overall structure type
  const hasArrayStructure = components.some((c) => c.structureType === "array")
  const hasObjectStructure = components.some((c) => c.structureType === "object")

  let structureType: "array" | "object" | "mixed" | "empty"
  if (componentsWithData.length === 0) {
    structureType = "empty"
  } else if (hasArrayStructure && !hasObjectStructure) {
    structureType = "array"
  } else if (hasObjectStructure && !hasArrayStructure) {
    structureType = "object"
  } else {
    structureType = "mixed"
  }

  // Run pattern detection
  const patterns = identifyComponentPatterns(components)

  const structure: DebugStructureAnalysis = {
    structureType,
    components,
    statistics,
    patterns,
  }

  return {
    structure,
  }
}
