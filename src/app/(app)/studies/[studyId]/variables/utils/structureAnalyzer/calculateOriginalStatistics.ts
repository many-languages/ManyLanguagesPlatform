/**
 * Calculate aggregated statistics for original structure analysis
 */

import type { ComponentStructureAnalysis } from "./analyzeComponentStructure"

export interface OriginalStatistics {
  totalComponents: number
  componentsWithData: number
  totalTopLevelGroups: number
  maxNestingDepth: number
  averageNestingDepth: number
}

/**
 * Calculate aggregated statistics from component structures
 */
export function calculateOriginalStatistics(
  components: ComponentStructureAnalysis[],
  totalComponents: number
): OriginalStatistics {
  const componentsWithData = components.filter(
    (c) => c.structureType !== "null" && c.structureType !== "empty"
  )

  const allTopLevelKeys = new Set<string>()
  componentsWithData.forEach((c) => {
    c.topLevelKeys.forEach((key) => allTopLevelKeys.add(key))
  })

  const maxNestingDepth = Math.max(...componentsWithData.map((c) => c.maxDepth), 0)
  const averageNestingDepth =
    componentsWithData.length > 0
      ? componentsWithData.reduce((sum, c) => sum + c.maxDepth, 0) / componentsWithData.length
      : 0

  return {
    totalComponents,
    componentsWithData: componentsWithData.length,
    totalTopLevelGroups: allTopLevelKeys.size,
    maxNestingDepth,
    averageNestingDepth,
  }
}
