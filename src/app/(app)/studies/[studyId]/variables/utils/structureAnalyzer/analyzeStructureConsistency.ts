/**
 * Structure Consistency Analysis Helpers
 * Analyzes extracted variables to detect consistency issues and structural variations
 */

import type { ExtractedVariable } from "../../types"

export interface ConsistencyIssue {
  path: string
  issue: "missing_in_some" | "type_mismatch" | "structure_variation"
  description: string
  affectedOccurrences: number
  totalOccurrences: number
}

export interface ConsistencyReport {
  isConsistent: boolean
  issues: ConsistencyIssue[]
  coverageByPath: Map<string, { occurrences: number; totalPossible: number; coverage: number }>
}

/**
 * Check if variables appear consistently across all occurrences
 * For variables with multiple occurrences, checks if the same variables always appear
 */
export function checkPathConsistency(variables: ExtractedVariable[]): ConsistencyIssue[] {
  const issues: ConsistencyIssue[] = []
  const variableOccurrences = new Map<string, number>()

  // Count occurrences of each variable
  variables.forEach((variable) => {
    variableOccurrences.set(variable.variableName, variable.occurrences)
  })

  // Group variables by their parent path
  const variableGroups = new Map<string, Set<string>>()
  variables.forEach((variable) => {
    const parts = variable.variableName.split(".")
    if (parts.length > 1) {
      const parentPath = parts.slice(0, -1).join(".")
      if (!variableGroups.has(parentPath)) {
        variableGroups.set(parentPath, new Set())
      }
      variableGroups.get(parentPath)!.add(variable.variableName)
    }
  })

  // Check for missing variables in groups
  variableGroups.forEach((variables, parentPath) => {
    const occurrences = Array.from(variables).map((v) => variableOccurrences.get(v) ?? 0)
    const maxOccurrences = Math.max(...occurrences, 0)
    const minOccurrences = Math.min(...occurrences, 0)

    if (maxOccurrences > minOccurrences && minOccurrences > 0) {
      // Some variables appear less frequently
      variables.forEach((variableName) => {
        const variableOccurrence = variableOccurrences.get(variableName) ?? 0
        if (variableOccurrence < maxOccurrences) {
          issues.push({
            path: variableName,
            issue: "missing_in_some",
            description: `Variable appears in ${variableOccurrence}/${maxOccurrences} occurrences`,
            affectedOccurrences: variableOccurrence,
            totalOccurrences: maxOccurrences,
          })
        }
      })
    }
  })

  return issues
}

/**
 * Detect missing keys in nested structures
 * Compares structures at the same nesting level to find missing properties
 */
export function detectMissingKeys(variables: ExtractedVariable[]): ConsistencyIssue[] {
  const issues: ConsistencyIssue[] = []
  const variableGroups = new Map<string, ExtractedVariable[]>()

  // Group variables by their parent path (parent object)
  variables.forEach((variable) => {
    if (variable.variableName.includes(".")) {
      const parts = variable.variableName.split(".")
      const parentPath = parts.slice(0, -1).join(".")
      if (!variableGroups.has(parentPath)) {
        variableGroups.set(parentPath, [])
      }
      variableGroups.get(parentPath)!.push(variable)
    }
  })

  // For each group, check if all variables have the same occurrence count
  variableGroups.forEach((group, parentPath) => {
    if (group.length === 0) return

    const occurrenceCounts = group.map((v) => v.occurrences)
    const maxOccurrences = Math.max(...occurrenceCounts)

    group.forEach((variable) => {
      if (variable.occurrences < maxOccurrences) {
        issues.push({
          path: variable.variableName,
          issue: "missing_in_some",
          description: `Missing in some occurrences of ${parentPath}`,
          affectedOccurrences: variable.occurrences,
          totalOccurrences: maxOccurrences,
        })
      }
    })
  })

  return issues
}

/**
 * Find structural variations - where the same parent path has different nested structures
 */
export function findStructuralVariations(variables: ExtractedVariable[]): ConsistencyIssue[] {
  const issues: ConsistencyIssue[] = []
  const structureMap = new Map<string, Set<string>>()

  // Group paths by their direct parent
  variables.forEach((variable) => {
    const parts = variable.variableName.split(".")
    if (parts.length >= 2) {
      const parentPath = parts.slice(0, -1).join(".")
      const leafName = parts[parts.length - 1]

      if (!structureMap.has(parentPath)) {
        structureMap.set(parentPath, new Set())
      }
      structureMap.get(parentPath)!.add(leafName)
    }
  })

  // Check for variations in structure
  structureMap.forEach((children, parentPath) => {
    // If this is an array path (contains [*]), check if all items have the same structure
    if (parentPath.includes("[*]")) {
      // This is already handled by our nested extractor, but we could add validation here
      const childOccurrences = Array.from(children).map((child) => {
        const fullPath = `${parentPath}.${child}`
        const variable = variables.find((v) => v.variableName === fullPath)
        return variable?.occurrences ?? 0
      })

      const uniqueOccurrenceCounts = new Set(childOccurrences)
      if (uniqueOccurrenceCounts.size > 1) {
        issues.push({
          path: parentPath,
          issue: "structure_variation",
          description: `Structure varies across array items in ${parentPath}`,
          affectedOccurrences: Math.min(...childOccurrences),
          totalOccurrences: Math.max(...childOccurrences),
        })
      }
    }
  })

  return issues
}

/**
 * Generate a comprehensive consistency report
 */
export function analyzeStructureConsistency(variables: ExtractedVariable[]): ConsistencyReport {
  const issues = [
    ...checkPathConsistency(variables),
    ...detectMissingKeys(variables),
    ...findStructuralVariations(variables),
  ]

  // Calculate coverage by variable
  const coverageByPath = new Map<
    string,
    { occurrences: number; totalPossible: number; coverage: number }
  >()

  // Group by groups (top-level segments) to calculate coverage
  const variableGroups = new Map<string, ExtractedVariable[]>()
  variables.forEach((variable) => {
    if (variable.variableName.includes(".") || variable.variableName.includes("[")) {
      const parts = variable.variableName.split(/[\.\[]/)
      if (parts.length > 1) {
        const groupName = parts[0]
        if (!variableGroups.has(groupName)) {
          variableGroups.set(groupName, [])
        }
        variableGroups.get(groupName)!.push(variable)
      }
    }
  })

  variableGroups.forEach((group, groupName) => {
    const maxOccurrences = Math.max(...group.map((v) => v.occurrences), 0)
    group.forEach((variable) => {
      coverageByPath.set(variable.variableName, {
        occurrences: variable.occurrences,
        totalPossible: maxOccurrences,
        coverage: maxOccurrences > 0 ? variable.occurrences / maxOccurrences : 0,
      })
    })
  })

  return {
    isConsistent: issues.length === 0,
    issues,
    coverageByPath,
  }
}
