/**
 * Original Structure Analysis
 * Analyzes the original parsedData structure BEFORE variable extraction
 * This shows the actual data structure as it exists in the JATOS results
 */

import type { EnrichedJatosStudyResult } from "@/src/types/jatos"
import {
  analyzeComponentStructure,
  type ComponentStructureAnalysis,
} from "./analyzeComponentStructure"
import {
  analyzeOriginalConsistency,
  type OriginalConsistencyReport,
} from "./analyzeOriginalConsistency"
import {
  identifyOriginalPatterns,
  analyzeOriginalArrayPatterns,
  deriveOverallStructureType,
  type OriginalDetectedPattern,
} from "./detectOriginalPatterns"
import {
  validateOriginalStructure,
  type OriginalValidationResult,
} from "./validateOriginalStructure"
import {
  generateOriginalRecommendations,
  type OriginalRecommendation,
} from "./generateOriginalRecommendations"
import { calculateOriginalStatistics, type OriginalStatistics } from "./calculateOriginalStatistics"

// Re-export ComponentStructureAnalysis for external use
export type { ComponentStructureAnalysis } from "./analyzeComponentStructure"

export interface OriginalStructureAnalysis {
  // Overall structure type
  structureType: "array" | "object" | "mixed" | "empty"

  // Component-level analysis
  components: ComponentStructureAnalysis[]

  // Aggregated statistics
  statistics: OriginalStatistics

  // Map of top-level key names to their types
  topLevelKeyTypes: Map<string, "primitive" | "array" | "object">

  // Enhanced analysis
  consistency: OriginalConsistencyReport
  patterns: OriginalDetectedPattern[]
  arrayPatterns: ReturnType<typeof analyzeOriginalArrayPatterns>
  validation: OriginalValidationResult
  recommendations: OriginalRecommendation[]
}

/**
 * Analyze the original structure of parsedData
 */
export function analyzeOriginalStructure(
  enrichedResult: EnrichedJatosStudyResult
): OriginalStructureAnalysis {
  const components: ComponentStructureAnalysis[] = []

  enrichedResult.componentResults.forEach((component) => {
    if (!component.parsedData) {
      components.push({
        componentId: component.componentId,
        structureType: "null",
        topLevelKeys: [],
        topLevelKeyTypes: new Map(),
        maxDepth: 0,
        totalKeys: 0,
      })
      return
    }

    const data = component.parsedData
    const analysis = analyzeComponentStructure(data, component.componentId)
    components.push(analysis)
  })

  // Calculate aggregated statistics
  const componentsWithData = components.filter(
    (c) => c.structureType !== "null" && c.structureType !== "empty"
  )
  const statistics = calculateOriginalStatistics(components, enrichedResult.componentResults.length)

  // Calculate top-level key types map
  const keyTypeMap = new Map<string, "primitive" | "array" | "object">()
  componentsWithData.forEach((c) => {
    c.topLevelKeys.forEach((key) => {
      // If key exists in this component, track its type
      // If key appears in multiple components, prefer object > array > primitive
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

  // Determine overall structure type from patterns
  const structureType = deriveOverallStructureType(components)

  // Run enhanced analyses (consistency will be recalculated in UI with selected components)
  // Don't run cross-component checks by default - let UI handle selection
  const consistency = analyzeOriginalConsistency(enrichedResult, components, [])
  const patterns = identifyOriginalPatterns(components)
  const arrayPatterns = analyzeOriginalArrayPatterns(enrichedResult, components)
  const validation = validateOriginalStructure(enrichedResult, components)
  const recommendations = generateOriginalRecommendations(
    components,
    {
      maxNestingDepth: statistics.maxNestingDepth,
      componentsWithData: statistics.componentsWithData,
    },
    consistency,
    validation,
    patterns
  )

  return {
    structureType,
    components,
    statistics,
    topLevelKeyTypes: keyTypeMap,
    consistency,
    patterns,
    arrayPatterns,
    validation,
    recommendations,
  }
}
