/**
 * Pattern Detection Helpers
 * Detect common patterns in extracted variable structures
 */

import type { ExtractedVariable } from "../../types"
import { isArrayPath, isNestedObjectPath, isFlatPath } from "./utils"

export interface VariableGroup {
  groupName: string
  variables: ExtractedVariable[]
  pattern: "object" | "array" | "mixed"
}

export interface DetectedPattern {
  type: "nested_object" | "array_of_objects" | "flat_structure" | "mixed"
  description: string
  examplePaths: string[]
  confidence: number // 0-1
}

/**
 * Identify common patterns in variable structures
 */
export function identifyCommonPatterns(variables: ExtractedVariable[]): DetectedPattern[] {
  const patterns: DetectedPattern[] = []

  // Check for nested object pattern (e.g., response.rating, response.demographics.age)
  const nestedObjectPaths = variables.filter((v) => isNestedObjectPath(v.variableName))
  if (nestedObjectPaths.length > 0) {
    patterns.push({
      type: "nested_object",
      description: "Nested object structure detected",
      examplePaths: nestedObjectPaths.slice(0, 3).map((v) => v.variableName),
      confidence: nestedObjectPaths.length / variables.length,
    })
  }

  // Check for array of objects pattern (e.g., trials[*].rt, trials[*].correct)
  const arrayPaths = variables.filter((v) => isArrayPath(v.variableName))
  if (arrayPaths.length > 0) {
    patterns.push({
      type: "array_of_objects",
      description: "Array of objects structure detected",
      examplePaths: arrayPaths.slice(0, 3).map((v) => v.variableName),
      confidence: arrayPaths.length / variables.length,
    })
  }

  // Check for flat structure (no nesting)
  const flatPaths = variables.filter((v) => isFlatPath(v.variableName))
  if (flatPaths.length === variables.length) {
    patterns.push({
      type: "flat_structure",
      description: "Flat structure with no nesting",
      examplePaths: flatPaths.slice(0, 3).map((v) => v.variableName),
      confidence: 1.0,
    })
  } else if (flatPaths.length > 0) {
    patterns.push({
      type: "mixed",
      description: "Mixed structure with both flat and nested variables",
      examplePaths: [...flatPaths.slice(0, 2), ...nestedObjectPaths.slice(0, 1)].map(
        (v) => v.variableName
      ),
      confidence: 0.5,
    })
  }

  return patterns
}

/**
 * Analyze array patterns - detect how arrays are structured
 */
export function analyzeArrayPatterns(variables: ExtractedVariable[]): {
  hasArrayPatterns: boolean
  arrayGroups: VariableGroup[]
  uniformArrays: string[] // Arrays where all items have the same structure
  variedArrays: string[] // Arrays where items have different structures
} {
  const arrayGroups = new Map<string, ExtractedVariable[]>()

  // Group variables by their array group identifier
  variables.forEach((variable) => {
    const match = variable.variableName.match(/^(.+?)\[.*?\](.*)$/)
    if (match) {
      const groupBase = match[1]
      const suffix = match[2] || ""
      const groupKey = `${groupBase}[*]${suffix}`

      if (!arrayGroups.has(groupKey)) {
        arrayGroups.set(groupKey, [])
      }
      arrayGroups.get(groupKey)!.push(variable)
    }
  })

  const arrayGroupsList: VariableGroup[] = Array.from(arrayGroups.entries()).map(
    ([groupName, vars]) => ({
      groupName,
      variables: vars,
      pattern: vars.some((v) => v.variableName.includes(".")) ? "array" : "array",
    })
  )

  // Check for uniformity (all variables in the array group have similar occurrence counts)
  const uniformArrays: string[] = []
  const variedArrays: string[] = []

  arrayGroups.forEach((vars, groupName) => {
    if (vars.length === 0) return

    const occurrences = vars.map((v) => v.occurrences)
    const uniqueOccurrences = new Set(occurrences)

    if (uniqueOccurrences.size === 1) {
      uniformArrays.push(groupName)
    } else {
      variedArrays.push(groupName)
    }
  })

  return {
    hasArrayPatterns: arrayGroups.size > 0,
    arrayGroups: arrayGroupsList,
    uniformArrays,
    variedArrays,
  }
}

/**
 * Map relationships between variables (parent-child, sibling relationships)
 */
export function mapVariableRelationships(variables: ExtractedVariable[]): {
  parentChild: Map<string, string[]> // parent path -> child variable names
  siblings: Map<string, string[]> // parent path -> sibling variable names
} {
  const parentChild = new Map<string, string[]>()
  const siblings = new Map<string, string[]>()

  variables.forEach((variable) => {
    const parts = variable.variableName.split(".")
    if (parts.length > 1) {
      // Has a parent
      const parentPath = parts.slice(0, -1).join(".")
      if (!parentChild.has(parentPath)) {
        parentChild.set(parentPath, [])
      }
      parentChild.get(parentPath)!.push(variable.variableName)
    }

    // Find siblings (variables with the same parent)
    if (parts.length > 1) {
      const parentPath = parts.slice(0, -1).join(".")
      if (!siblings.has(parentPath)) {
        siblings.set(parentPath, [])
      }
      siblings.get(parentPath)!.push(variable.variableName)
    } else {
      // Top-level variable
      const rootGroup = ""
      if (!siblings.has(rootGroup)) {
        siblings.set(rootGroup, [])
      }
      siblings.get(rootGroup)!.push(variable.variableName)
    }
  })

  return {
    parentChild,
    siblings,
  }
}
