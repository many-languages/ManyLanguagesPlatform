/**
 * Consistency Checks (Level 1)
 * Pure check functions for consistency issues
 */

import type { ComponentStructureAnalysis } from "./analyzeOriginalStructure"
import type { EnrichedJatosStudyResult } from "@/src/types/jatos"
import { analyzeArrayContent } from "../shared/arrayPatternDetection"

export interface ConsistencyIssue {
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

/**
 * Check if top-level keys appear consistently across selected components
 */
export function checkKeyConsistency(
  components: ComponentStructureAnalysis[],
  selectedComponentIds: number[]
): ConsistencyIssue[] {
  const issues: ConsistencyIssue[] = []
  const componentsToCheck = components.filter((c) => selectedComponentIds.includes(c.componentId))
  const componentsWithData = componentsToCheck.filter(
    (c) => c.structureType !== "null" && c.structureType !== "empty"
  )

  if (componentsWithData.length === 0) {
    return issues
  }

  const keyPresence = new Map<string, Set<number>>() // key -> set of component IDs

  // Track which components have each key
  componentsWithData.forEach((component) => {
    component.topLevelKeys.forEach((key) => {
      if (!keyPresence.has(key)) {
        keyPresence.set(key, new Set())
      }
      keyPresence.get(key)!.add(component.componentId)
    })
  })

  const totalComponents = componentsWithData.length

  // Collect all keys that don't appear in all selected components
  const missingKeys: Array<{ key: string; presentIn: number }> = []
  keyPresence.forEach((componentIds, key) => {
    if (componentIds.size < totalComponents && componentIds.size > 0) {
      missingKeys.push({
        key,
        presentIn: componentIds.size,
      })
    }
  })

  // Group all missing keys into a single issue
  if (missingKeys.length > 0) {
    const missingKeysList = missingKeys
      .slice(0, 10)
      .map((k) => `'${k.key}'`)
      .join(", ")
    const moreCount = missingKeys.length > 10 ? ` and ${missingKeys.length - 10} more` : ""

    issues.push({
      path: "root",
      issue: "missing_in_some",
      description: `${missingKeys.length} key(s) do not appear in all selected components: ${missingKeysList}${moreCount}`,
      affectedComponents: totalComponents,
      totalComponents,
    })
  }

  return issues
}

/**
 * Detect type mismatches for the same key across selected components
 */
export function detectTypeMismatches(
  components: ComponentStructureAnalysis[],
  selectedComponentIds: number[]
): ConsistencyIssue[] {
  const issues: ConsistencyIssue[] = []
  const componentsToCheck = components.filter((c) => selectedComponentIds.includes(c.componentId))
  const keyTypes = new Map<string, Map<number, "primitive" | "array" | "object">>() // key -> componentId -> type

  // Collect types for each key across components
  componentsToCheck.forEach((component) => {
    component.topLevelKeyTypes.forEach((type, key) => {
      if (!keyTypes.has(key)) {
        keyTypes.set(key, new Map())
      }
      keyTypes.get(key)!.set(component.componentId, type)
    })
  })

  // Check for type mismatches
  keyTypes.forEach((typeMap, key) => {
    const types = Array.from(new Set(typeMap.values()))
    if (types.length > 1) {
      const componentIds = Array.from(typeMap.keys())
      issues.push({
        path: key,
        issue: "type_mismatch",
        description: `Key '${key}' has different types across selected components: ${types.join(
          ", "
        )}`,
        affectedComponents: componentIds.length,
        totalComponents: componentIds.length,
      })
    }
  })

  return issues
}

/**
 * Find structural variations between selected components
 */
export function findStructuralVariations(
  components: ComponentStructureAnalysis[],
  selectedComponentIds: number[]
): ConsistencyIssue[] {
  const issues: ConsistencyIssue[] = []
  const componentsToCheck = components.filter((c) => selectedComponentIds.includes(c.componentId))

  if (componentsToCheck.length === 0) {
    return issues
  }

  const structureTypes = new Map<number, ComponentStructureAnalysis["structureType"]>()

  componentsToCheck.forEach((component) => {
    structureTypes.set(component.componentId, component.structureType)
  })

  const uniqueTypes = new Set(structureTypes.values())

  if (uniqueTypes.size > 1) {
    issues.push({
      issue: "structure_variation",
      path: "root",
      description: `Selected components have different structure types: ${Array.from(
        uniqueTypes
      ).join(", ")}`,
      affectedComponents: componentsToCheck.length,
      totalComponents: componentsToCheck.length,
    })
  }

  // Check for depth variations (only for components with actual data)
  const componentsWithData = componentsToCheck.filter(
    (c) => c.structureType !== "null" && c.structureType !== "empty"
  )

  if (componentsWithData.length >= 2) {
    const depths = componentsWithData.map((c) => c.maxDepth)
    const maxDepth = Math.max(...depths, 0)
    const minDepth = Math.min(...depths, 0)

    // Only warn if there's a significant depth variation (>1 level difference)
    // Small variations (0-1) are often expected (empty vs flat object)
    if (maxDepth !== minDepth && maxDepth - minDepth > 1) {
      issues.push({
        issue: "depth_variation",
        path: "root",
        description: `Nesting depth varies from ${minDepth} to ${maxDepth} across selected components`,
        affectedComponents: componentsWithData.length,
        totalComponents: componentsWithData.length,
      })
    }
  }

  return issues
}

/**
 * Check internal consistency within a component (for array structures)
 * Verifies if all items in an array have consistent structure
 * Includes array uniformity check (whether all items have the same keys)
 */
export function checkInternalConsistency(
  enrichedResult: EnrichedJatosStudyResult,
  componentId: number
): { isConsistent: boolean; issues: ConsistencyIssue[] } {
  const issues: ConsistencyIssue[] = []
  const component = enrichedResult.componentResults.find((c) => c.componentId === componentId)

  if (!component || !component.parsedData) {
    return {
      isConsistent: true,
      issues: [],
    }
  }

  const data = component.parsedData

  // Check if it's an array of objects
  if (Array.isArray(data) && data.length > 1) {
    const arrayAnalysis = analyzeArrayContent(data)

    // For arrays of objects, check uniformity (all items have same keys)
    if (arrayAnalysis.isArrayOfObjects) {
      const firstItem = data[0]

      if (typeof firstItem === "object" && firstItem !== null && !Array.isArray(firstItem)) {
        const firstItemKeys = new Set(Object.keys(firstItem))
        const inconsistentItems: number[] = []

        // Check each item for consistency
        data.forEach((item, index) => {
          if (typeof item !== "object" || item === null) {
            inconsistentItems.push(index)
            return
          }

          const itemKeys = new Set(Object.keys(item))

          // Check if keys match
          if (
            itemKeys.size !== firstItemKeys.size ||
            !Array.from(firstItemKeys).every((key) => itemKeys.has(key))
          ) {
            inconsistentItems.push(index)
          }
        })

        if (inconsistentItems.length > 0) {
          issues.push({
            componentId,
            path: `component_${componentId}`,
            issue: "array_uniformity",
            description: `Array in component ${componentId} has varied structure - ${inconsistentItems.length} of ${data.length} items have different keys`,
            affectedComponents: inconsistentItems.length,
            totalComponents: data.length,
          })
        }

        // Check for type mismatches within array items
        const keyTypes = new Map<string, Set<string>>() // key -> set of types found

        data.forEach((item) => {
          if (typeof item === "object" && item !== null) {
            Object.keys(item).forEach((key) => {
              const value = item[key]
              const valueType = Array.isArray(value)
                ? "array"
                : typeof value === "object" && value !== null
                ? "object"
                : "primitive"

              if (!keyTypes.has(key)) {
                keyTypes.set(key, new Set())
              }
              keyTypes.get(key)!.add(valueType)
            })
          }
        })

        keyTypes.forEach((types, key) => {
          if (types.size > 1) {
            issues.push({
              componentId,
              path: key,
              issue: "internal_inconsistency",
              description: `Key '${key}' has different types across array items: ${Array.from(
                types
              ).join(", ")}`,
              affectedComponents: data.length,
              totalComponents: data.length,
            })
          }
        })
      }
    }
  }

  return {
    isConsistent: issues.length === 0,
    issues,
  }
}
