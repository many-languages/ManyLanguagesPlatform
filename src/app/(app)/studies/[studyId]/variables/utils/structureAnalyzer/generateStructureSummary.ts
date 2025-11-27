/**
 * Structure Summary Generation Helpers
 * Generate summaries and visualizations of the structure
 */

import type { ExtractedVariable } from "../../types"
import { calculatePathDepth, getRootPath, getParentPath } from "./utils"

export interface VariableGroup {
  groupName: string
  variables: ExtractedVariable[]
  depth: number
  type: "object" | "array" | "flat"
}

export interface StructureMap {
  roots: string[] // Top-level variable names
  groups: VariableGroup[]
  hierarchy: Map<string, string[]> // parent -> children
}

export interface Recommendation {
  type: "info" | "warning" | "suggestion"
  message: string
  affectedPaths?: string[]
}

/**
 * Create a structure map showing the hierarchy of variables
 */
export function createStructureMap(variables: ExtractedVariable[]): StructureMap {
  const roots = new Set<string>()
  const groups = new Map<string, VariableGroup>()
  const hierarchy = new Map<string, string[]>()

  variables.forEach((variable) => {
    const rootPath = getRootPath(variable.variableName)
    roots.add(rootPath)

    // Determine depth
    const depth = calculatePathDepth(variable.variableName)

    // Group by group name (first segment) - add variable first, then determine type
    if (!groups.has(rootPath)) {
      groups.set(rootPath, {
        groupName: rootPath,
        variables: [],
        depth: 0, // Root depth
        type: "flat", // Will be updated after all variables are added
      })
    }
    groups.get(rootPath)!.variables.push(variable)

    // Build hierarchy
    const parent = getParentPath(variable.variableName)
    if (parent) {
      if (!hierarchy.has(parent)) {
        hierarchy.set(parent, [])
      }
      hierarchy.get(parent)!.push(variable.variableName)
    }
  })

  // Determine group types after all variables are added
  groups.forEach((group) => {
    const hasArrayVars = group.variables.some((v) => v.variableName.includes("[*]"))
    const hasNestedVars = group.variables.some((v) => v.variableName.includes("."))
    group.type = hasArrayVars ? "array" : hasNestedVars ? "object" : "flat"
    group.depth = Math.max(...group.variables.map((v) => calculatePathDepth(v.variableName)), 0)
  })

  return {
    roots: Array.from(roots).sort(),
    groups: Array.from(groups.values()).sort((a, b) => a.groupName.localeCompare(b.groupName)),
    hierarchy,
  }
}

/**
 * Generate recommendations based on structure analysis
 */
export function generateRecommendations(
  variables: ExtractedVariable[],
  statistics: any,
  validation: any,
  patterns: any
): Recommendation[] {
  const recommendations: Recommendation[] = []

  // Check for deep nesting
  if (statistics.maxDepth > 4) {
    recommendations.push({
      type: "warning",
      message: `Deep nesting detected (max depth: ${statistics.maxDepth}). Consider flattening the structure if possible.`,
      affectedPaths: variables
        .filter((v) => calculatePathDepth(v.variableName) > 4)
        .map((v) => v.variableName)
        .slice(0, 5),
    })
  }

  // Check for inconsistent structures
  if (validation.issues.length > 0) {
    const errors = validation.errors
    if (errors.length > 0) {
      recommendations.push({
        type: "warning",
        message: `${errors.length} validation error(s) found. Review data structure consistency.`,
        affectedPaths: errors.map((e: any) => e.path).slice(0, 5),
      })
    }
  }

  // Check for mixed patterns
  const patternTypes = new Set(patterns.map((p: any) => p.type))
  if (patternTypes.size > 2) {
    recommendations.push({
      type: "info",
      message:
        "Mixed structure patterns detected. Consider standardizing the data format for easier analysis.",
    })
  }

  // Check for array patterns
  if (patterns.some((p: any) => p.type === "array_of_objects")) {
    recommendations.push({
      type: "info",
      message:
        "Array of objects pattern detected. Variables can be aggregated using array indices.",
    })
  }

  // Suggest grouping related variables
  const nestedVars = variables.filter((v) => v.variableName.includes("."))
  if (nestedVars.length > 5) {
    recommendations.push({
      type: "suggestion",
      message: `Consider grouping ${nestedVars.length} nested variables by their groups for easier management.`,
    })
  }

  return recommendations
}

/**
 * Build variable groups by their group name (first segment)
 */
export function buildVariableGroups(
  variables: ExtractedVariable[]
): Map<string, ExtractedVariable[]> {
  const groups = new Map<string, ExtractedVariable[]>()

  variables.forEach((variable) => {
    const groupName = getRootPath(variable.variableName)

    if (!groups.has(groupName)) {
      groups.set(groupName, [])
    }
    groups.get(groupName)!.push(variable)
  })

  return groups
}
