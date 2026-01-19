/**
 * Debug Structure Analysis
 * Analyzes extraction results to produce standardized structure data for debug UI
 * Derives structure from observations (post-transformation) rather than raw parsedData
 */

import type { EnrichedJatosStudyResult } from "@/src/types/jatos"
import type { ExtractionBundle, ExtractionObservation, ValueType } from "../../types"
import type { DataFormat } from "@/src/lib/jatos/parsers/formatDetector"
import { identifyOriginalPatterns, type OriginalDetectedPattern } from "./detectOriginalPatterns"
import { type OriginalStatistics } from "./calculateOriginalStatistics"

export interface ComponentStructureAnalysis {
  componentId: number
  originalFormat?: DataFormat // Format user uploaded (csv, json, tsv, text)
  structureType: "array" | "object" | "primitive" | "null" | "empty"
  topLevelKeys: string[]
  topLevelKeyTypes: Map<string, "primitive" | "array" | "object">
  maxDepth: number
  totalKeys: number
  hasError?: boolean
  errorInfo?: { code: string; message: string }
}

export interface DebugStructureAnalysis {
  // Overall structure type (post-transformation)
  structureType: "array" | "object" | "mixed" | "empty"

  // Component-level analysis (derived from observations)
  components: ComponentStructureAnalysis[]

  // Aggregated statistics
  statistics: OriginalStatistics

  // Map of top-level key names to their types
  topLevelKeyTypes: Map<string, "primitive" | "array" | "object">

  // Pattern detection (derived from observations)
  patterns: OriginalDetectedPattern[]
  arrayPatterns: { hasArrayPatterns: boolean; arrayComponents: ComponentStructureAnalysis[] }
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
 * Analyze debug structure from extraction results
 * Derives structure from observations (post-transformation) rather than raw parsedData
 */
export function analyzeDebugStructure(
  extractionBundle: ExtractionBundle,
  enrichedResult: EnrichedJatosStudyResult
): DebugStructureAnalysis {
  const { observations, diagnostics } = extractionBundle

  // Group observations by componentId
  const observationsByComponent = new Map<number, ExtractionObservation[]>()
  observations.forEach((obs) => {
    const componentId = obs.scopeKeys.componentId
    if (!observationsByComponent.has(componentId)) {
      observationsByComponent.set(componentId, [])
    }
    observationsByComponent.get(componentId)!.push(obs)
  })

  // Analyze each component
  const components: ComponentStructureAnalysis[] = []

  enrichedResult.componentResults.forEach((component) => {
    const componentId = component.componentId
    const componentObs = observationsByComponent.get(componentId) || []
    const componentDiags = diagnostics.component.get(componentId) || []

    // Check for errors
    const errorDiag = componentDiags.find((d) => d.severity === "error")
    const hasError = !!errorDiag

    // If no observations and has error, mark as error component
    if (componentObs.length === 0 && hasError) {
      components.push({
        componentId,
        originalFormat: component.detectedFormat?.format,
        structureType: "null",
        topLevelKeys: [],
        topLevelKeyTypes: new Map(),
        maxDepth: 0,
        totalKeys: 0,
        hasError: true,
        errorInfo: errorDiag ? { code: errorDiag.code, message: errorDiag.message } : undefined,
      })
      return
    }

    // If no observations and no error, mark as empty
    if (componentObs.length === 0) {
      components.push({
        componentId,
        originalFormat: component.detectedFormat?.format,
        structureType: "empty",
        topLevelKeys: [],
        topLevelKeyTypes: new Map(),
        maxDepth: 0,
        totalKeys: 0,
      })
      return
    }

    // Derive structure from observations
    // Check if any observation has array indices in variableKey (contains [*])
    const hasArrayStructure = componentObs.some((obs) => obs.variableKey.includes("[*]"))

    // Collect top-level keys (first element of keyPath)
    const topLevelKeysSet = new Set<string>()
    const topLevelKeyTypes = new Map<string, "primitive" | "array" | "object">()

    componentObs.forEach((obs) => {
      if (obs.keyPath.length > 0) {
        const topKey = obs.keyPath[0]
        if (topKey !== "*") {
          // Skip root-level array elements
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
    })

    const topLevelKeys = Array.from(topLevelKeysSet)

    // Calculate max depth and total unique variables
    const maxDepth = Math.max(...componentObs.map((obs) => obs.depth), 0)
    const uniqueVariableKeys = new Set(componentObs.map((obs) => obs.variableKey))
    const totalKeys = uniqueVariableKeys.size

    // Determine structure type
    let structureType: "array" | "object" | "primitive"
    if (hasArrayStructure) {
      structureType = "array"
    } else if (topLevelKeys.length > 0) {
      structureType = "object"
    } else {
      structureType = "primitive"
    }

    components.push({
      componentId,
      originalFormat: component.detectedFormat?.format,
      structureType,
      topLevelKeys,
      topLevelKeyTypes,
      maxDepth,
      totalKeys,
      hasError: hasError,
      errorInfo: errorDiag ? { code: errorDiag.code, message: errorDiag.message } : undefined,
    })
  })

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

  const statistics: OriginalStatistics = {
    totalComponents: enrichedResult.componentResults.length,
    componentsWithData: componentsWithData.length,
    totalTopLevelGroups: allTopLevelKeys.size,
    maxNestingDepth,
    averageNestingDepth,
  }

  // Calculate top-level key types map (aggregated across components)
  const keyTypeMap = new Map<string, "primitive" | "array" | "object">()
  componentsWithData.forEach((c) => {
    c.topLevelKeys.forEach((key) => {
      const existingType = keyTypeMap.get(key)
      const currentType = c.topLevelKeyTypes.get(key)

      if (currentType) {
        if (!existingType) {
          keyTypeMap.set(key, currentType)
        } else {
          // Prefer more complex types
          if (
            currentType === "object" ||
            (currentType === "array" && existingType === "primitive")
          ) {
            keyTypeMap.set(key, currentType)
          }
        }
      }
    })
  })

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
  const patterns = identifyOriginalPatterns(components)
  const arrayComponents = components.filter((c) => c.structureType === "array")
  const arrayPatterns = {
    hasArrayPatterns: arrayComponents.length > 0,
    arrayComponents,
  }

  return {
    structureType,
    components,
    statistics,
    topLevelKeyTypes: keyTypeMap,
    patterns,
    arrayPatterns,
  }
}
