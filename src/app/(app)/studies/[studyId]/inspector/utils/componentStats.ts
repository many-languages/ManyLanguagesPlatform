import type { ExtractedVariable } from "../../variables/types"

export interface ComponentStats {
  maxDepth: number
  totalVariables: number
}

/**
 * Compute component statistics using variable keys + variable lookup.
 * Avoids scanning extractedVariables for each component.
 */
export function computeComponentStats(
  variableKeys: string[],
  variableByKey: ReadonlyMap<string, ExtractedVariable>
): ComponentStats {
  const totalVariables = variableKeys.length
  if (totalVariables === 0) return { maxDepth: 0, totalVariables: 0 }

  let maxDepth = 0
  for (const key of variableKeys) {
    const v = variableByKey.get(key)
    if (!v) continue
    if (v.depth > maxDepth) maxDepth = v.depth
  }

  return { maxDepth, totalVariables }
}
