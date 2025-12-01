/**
 * Original Structure Consistency Analysis
 * Orchestrates consistency checks and generates report
 */

import type { ComponentStructureAnalysis } from "./analyzeOriginalStructure"
import type { EnrichedJatosStudyResult } from "@/src/types/jatos"
import * as consistencyChecks from "./consistencyChecks"

export interface OriginalConsistencyIssue {
  componentId?: number
  path: string
  issue:
    | "missing_in_some"
    | "type_mismatch"
    | "structure_variation"
    | "depth_variation"
    | "internal_inconsistency"
    | "array_item_variation"
    | "array_uniformity"
  description: string
  affectedComponents: number
  totalComponents: number
}

export interface InternalConsistencyReport {
  componentId: number
  isConsistent: boolean
  issues: OriginalConsistencyIssue[]
}

export interface OriginalConsistencyReport {
  isConsistent: boolean
  issues: OriginalConsistencyIssue[]
  keyCoverage: Map<string, { presentIn: number; totalComponents: number; coverage: number }>
  internalConsistency?: Map<number, InternalConsistencyReport> // componentId -> internal report
}

/**
 * Generate comprehensive consistency report for original structure
 * Uses Level 1 consistency checks
 */
export function analyzeOriginalConsistency(
  enrichedResult: EnrichedJatosStudyResult,
  components: ComponentStructureAnalysis[],
  selectedComponentIds?: number[]
): OriginalConsistencyReport {
  // If no selection, use all components with data
  const defaultSelectedIds =
    selectedComponentIds ??
    components
      .filter((c) => c.structureType !== "null" && c.structureType !== "empty")
      .map((c) => c.componentId)

  if (defaultSelectedIds.length === 0) {
    return {
      isConsistent: true,
      issues: [],
      keyCoverage: new Map(),
    }
  }

  const componentsWithData = components.filter(
    (c) =>
      defaultSelectedIds.includes(c.componentId) &&
      c.structureType !== "null" &&
      c.structureType !== "empty"
  )

  // Run cross-component consistency checks only when 2+ components are selected
  // (These checks only make sense when comparing multiple components)
  const issues: OriginalConsistencyIssue[] = []
  if (defaultSelectedIds.length >= 2) {
    issues.push(
      ...consistencyChecks.checkKeyConsistency(components, defaultSelectedIds),
      ...consistencyChecks.detectTypeMismatches(components, defaultSelectedIds),
      ...consistencyChecks.findStructuralVariations(components, defaultSelectedIds)
    )
  }

  // Calculate key coverage
  const keyCoverage = new Map<
    string,
    { presentIn: number; totalComponents: number; coverage: number }
  >()

  const allKeys = new Set<string>()
  componentsWithData.forEach((component) => {
    component.topLevelKeys.forEach((key) => allKeys.add(key))
  })

  allKeys.forEach((key) => {
    const presentIn = componentsWithData.filter((c) => c.topLevelKeys.includes(key)).length
    const total = componentsWithData.length
    keyCoverage.set(key, {
      presentIn,
      totalComponents: total,
      coverage: total > 0 ? presentIn / total : 0,
    })
  })

  // Check internal consistency for selected components
  const internalConsistency = new Map<number, InternalConsistencyReport>()
  defaultSelectedIds.forEach((componentId) => {
    const internalResult = consistencyChecks.checkInternalConsistency(enrichedResult, componentId)
    if (internalResult.issues.length > 0) {
      internalConsistency.set(componentId, {
        componentId,
        isConsistent: internalResult.isConsistent,
        issues: internalResult.issues,
      })
    }
  })

  return {
    isConsistent: issues.length === 0 && internalConsistency.size === 0,
    issues,
    keyCoverage,
    internalConsistency: internalConsistency.size > 0 ? internalConsistency : undefined,
  }
}
