/**
 * Statistics Calculation Helpers
 * Calculate various statistics about extracted variable structures
 */

import type { ExtractedVariable } from "../../types"
import { calculatePathDepth } from "./utils"

export interface StructureStatistics {
  totalVariables: number
  totalOccurrences: number
  depthDistribution: Map<number, number> // depth -> count
  typeDistribution: Map<ExtractedVariable["type"], number>
  maxDepth: number
  averageDepth: number
  complexity: {
    totalVariables: number
    averageVariablesPerGroup: number
    maxVariablesPerGroup: number
  }
}

/**
 * Count how often each variable appears
 */
export function countVariableOccurrences(variables: ExtractedVariable[]): Map<string, number> {
  const occurrences = new Map<string, number>()
  variables.forEach((variable) => {
    occurrences.set(variable.variableName, variable.occurrences)
  })
  return occurrences
}

/**
 * Calculate depth distribution - how many variables exist at each nesting depth
 */
export function calculateDepthDistribution(variables: ExtractedVariable[]): Map<number, number> {
  const depthCounts = new Map<number, number>()

  variables.forEach((variable) => {
    const depth = calculatePathDepth(variable.variableName)
    depthCounts.set(depth, (depthCounts.get(depth) || 0) + 1)
  })

  return depthCounts
}

/**
 * Measure structure complexity
 */
export function measureComplexity(variables: ExtractedVariable[]): {
  totalVariables: number
  averageVariablesPerGroup: number
  maxVariablesPerGroup: number
} {
  // Group variables by their group name (first segment)
  const groupCounts = new Map<string, number>()

  variables.forEach((variable) => {
    const firstSegment = variable.variableName.split(/[\.\[]/)[0]
    groupCounts.set(firstSegment, (groupCounts.get(firstSegment) || 0) + 1)
  })

  const variableCounts = Array.from(groupCounts.values())
  const totalVariables = variables.length
  const averageVariablesPerGroup =
    variableCounts.length > 0 ? totalVariables / variableCounts.length : 0
  const maxVariablesPerGroup = variableCounts.length > 0 ? Math.max(...variableCounts) : 0

  return {
    totalVariables,
    averageVariablesPerGroup,
    maxVariablesPerGroup,
  }
}

/**
 * Calculate comprehensive structure statistics
 */
export function calculateStatistics(variables: ExtractedVariable[]): StructureStatistics {
  const depthDistribution = calculateDepthDistribution(variables)
  const depths = Array.from(depthDistribution.keys())
  const maxDepth = depths.length > 0 ? Math.max(...depths) : 0

  // Calculate average depth
  const totalDepth = variables.reduce(
    (sum, variable) => sum + calculatePathDepth(variable.variableName),
    0
  )
  const averageDepth = variables.length > 0 ? totalDepth / variables.length : 0

  // Type distribution
  const typeDistribution = new Map<ExtractedVariable["type"], number>()
  variables.forEach((variable) => {
    typeDistribution.set(variable.type, (typeDistribution.get(variable.type) || 0) + 1)
  })

  // Total occurrences
  const totalOccurrences = variables.reduce((sum, v) => sum + v.occurrences, 0)

  // Complexity
  const complexity = measureComplexity(variables)

  return {
    totalVariables: variables.length,
    totalOccurrences,
    depthDistribution,
    typeDistribution,
    maxDepth,
    averageDepth,
    complexity,
  }
}
