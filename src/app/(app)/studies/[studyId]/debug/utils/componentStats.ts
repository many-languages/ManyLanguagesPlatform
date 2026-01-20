/**
 * Component Statistics Helper
 * Computes simple stats for a component from extracted variables
 */

import type { ExtractedVariable } from "../../variables/types"

export interface ComponentStats {
  maxDepth: number
  totalVariables: number
}

/**
 * Compute component statistics from extracted variables
 */
export function computeComponentStats(
  componentId: number,
  extractedVariables: ExtractedVariable[]
): ComponentStats {
  // Get all variables for this component
  const componentVariables = extractedVariables.filter((variable) =>
    variable.componentIds.includes(componentId)
  )

  if (componentVariables.length === 0) {
    return {
      maxDepth: 0,
      totalVariables: 0,
    }
  }

  // Calculate max depth from variable depths
  const maxDepth = Math.max(...componentVariables.map((v) => v.depth), 0)

  // Count unique variables (by variableKey)
  const uniqueVariables = new Set(componentVariables.map((v) => v.variableKey))

  return {
    maxDepth,
    totalVariables: uniqueVariables.size,
  }
}
