/**
 * Structure Analyzer
 * Main orchestrator that combines all structure analysis helpers
 *
 * This module analyzes extracted variables to provide insights about:
 * - Structure consistency
 * - Patterns and relationships
 * - Statistics and metrics
 * - Validation and quality checks
 * - Summaries and recommendations
 *
 * @example
 * ```ts
 * import { extractVariables } from './extractVariable'
 * import { analyzeStructure } from './structureAnalyzer'
 *
 * // Extract variables first
 * const variables = extractVariables(enrichedResult)
 *
 * // Then analyze the structure
 * const analysis = analyzeStructure(variables)
 *
 * // Access results
 * console.log(analysis.statistics)
 * console.log(analysis.patterns)
 * console.log(analysis.recommendations)
 * ```
 */

import type { ExtractedVariable } from "../../types"
import { analyzeStructureConsistency, type ConsistencyReport } from "./analyzeStructureConsistency"
import { calculateStatistics, type StructureStatistics } from "./calculateStatistics"
import {
  identifyCommonPatterns,
  analyzeArrayPatterns,
  mapVariableRelationships,
  type DetectedPattern,
} from "./detectPatterns"
import { validateStructures, type ValidationResult } from "./validateStructures"
import {
  createStructureMap,
  generateRecommendations,
  buildVariableGroups,
  type StructureMap,
  type Recommendation,
  type VariableGroup as SummaryVariableGroup,
} from "./generateStructureSummary"

export interface StructureAnalysis {
  // Consistency analysis
  consistency: ConsistencyReport

  // Statistics
  statistics: StructureStatistics

  // Pattern detection
  patterns: DetectedPattern[]
  arrayPatterns: ReturnType<typeof analyzeArrayPatterns>
  relationships: ReturnType<typeof mapVariableRelationships>

  // Validation
  validation: ValidationResult

  // Summary and recommendations
  structureMap: StructureMap
  variableGroups: Map<string, ExtractedVariable[]>
  recommendations: Recommendation[]
}

/**
 * Main function: Analyze the structure of extracted variables
 *
 * @param variables Array of extracted variables to analyze
 * @param options Optional configuration for analysis
 * @returns Comprehensive structure analysis report
 */
export function analyzeStructure(
  variables: ExtractedVariable[],
  options?: {
    maxRecommendedDepth?: number
  }
): StructureAnalysis {
  // Run all analyses
  const consistency = analyzeStructureConsistency(variables)
  const statistics = calculateStatistics(variables)
  const patterns = identifyCommonPatterns(variables)
  const arrayPatterns = analyzeArrayPatterns(variables)
  const relationships = mapVariableRelationships(variables)
  const validation = validateStructures(variables, options)
  const structureMap = createStructureMap(variables)
  const variableGroups = buildVariableGroups(variables)
  const recommendations = generateRecommendations(variables, statistics, validation, patterns)

  return {
    consistency,
    statistics,
    patterns,
    arrayPatterns,
    relationships,
    validation,
    structureMap,
    variableGroups,
    recommendations,
  }
}

// Export types for use in other modules
export type {
  ConsistencyReport,
  StructureStatistics,
  DetectedPattern,
  ValidationResult,
  StructureMap,
  Recommendation,
  SummaryVariableGroup,
}

// Export helper functions for direct use if needed
export { analyzeStructureConsistency } from "./analyzeStructureConsistency"
export { calculateStatistics } from "./calculateStatistics"
export {
  identifyCommonPatterns,
  analyzeArrayPatterns,
  mapVariableRelationships,
} from "./detectPatterns"
export { validateStructures } from "./validateStructures"
export {
  createStructureMap,
  generateRecommendations,
  buildVariableGroups,
} from "./generateStructureSummary"
