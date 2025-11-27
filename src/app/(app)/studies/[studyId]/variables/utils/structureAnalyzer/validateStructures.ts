/**
 * Structure Validation Helpers
 * Validate structures for data quality and consistency issues
 */

import type { ExtractedVariable } from "../../types"
import { calculatePathDepth } from "./utils"

export interface ValidationIssue {
  path: string
  severity: "warning" | "error"
  type:
    | "type_inconsistency"
    | "excessive_depth"
    | "complex_nesting"
    | "missing_values"
    | "inconsistent_structure"
  message: string
}

export interface ValidationResult {
  isValid: boolean
  issues: ValidationIssue[]
  warnings: ValidationIssue[]
  errors: ValidationIssue[]
}

/**
 * Validate that the same path doesn't have inconsistent types across occurrences
 */
export function validateTypeConsistency(variables: ExtractedVariable[]): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  // Group variables by their path (in case of duplicates - shouldn't happen but check anyway)
  const pathGroups = new Map<string, ExtractedVariable[]>()
  variables.forEach((variable) => {
    if (!pathGroups.has(variable.variableName)) {
      pathGroups.set(variable.variableName, [])
    }
    pathGroups.get(variable.variableName)!.push(variable)
  })

  // Check for type inconsistencies
  pathGroups.forEach((group, path) => {
    if (group.length > 1) {
      const types = new Set(group.map((v) => v.type))
      if (types.size > 1) {
        issues.push({
          path,
          severity: "error",
          type: "type_inconsistency",
          message: `Variable has inconsistent types: ${Array.from(types).join(", ")}`,
        })
      }
    }
  })

  return issues
}

/**
 * Check for excessive nesting depth (potential complexity issue)
 */
export function checkDataQuality(
  variables: ExtractedVariable[],
  maxRecommendedDepth = 5
): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  variables.forEach((variable) => {
    const depth = calculatePathDepth(variable.variableName)

    if (depth > maxRecommendedDepth) {
      issues.push({
        path: variable.variableName,
        severity: "warning",
        type: "excessive_depth",
        message: `Variable has depth ${depth}, which may indicate overly complex structure`,
      })
    }
  })

  return issues
}

/**
 * Detect complex nesting patterns that might be difficult to work with
 */
export function detectComplexNesting(variables: ExtractedVariable[]): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  // Check for nested arrays (arrays within arrays)
  variables.forEach((variable) => {
    const arrayMatches = variable.variableName.match(/\[/g)
    const arrayCount = arrayMatches ? arrayMatches.length : 0

    if (arrayCount > 1) {
      issues.push({
        path: variable.variableName,
        severity: "warning",
        type: "complex_nesting",
        message: `Nested arrays detected (${arrayCount} levels), may be difficult to work with`,
      })
    }

    // Check for very deep object nesting
    const depth = calculatePathDepth(variable.variableName)
    if (depth > 4) {
      issues.push({
        path: variable.variableName,
        severity: "warning",
        type: "complex_nesting",
        message: `Deep object nesting (${dots} levels) detected`,
      })
    }
  })

  return issues
}

/**
 * Check for missing values in nested structures
 */
export function detectMissingValues(variables: ExtractedVariable[]): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  // Group by parent path to check for missing values
  const variableGroups = new Map<string, ExtractedVariable[]>()
  variables.forEach((variable) => {
    const parts = variable.variableName.split(".")
    if (parts.length > 1) {
      const parentPath = parts.slice(0, -1).join(".")
      if (!variableGroups.has(parentPath)) {
        variableGroups.set(parentPath, [])
      }
      variableGroups.get(parentPath)!.push(variable)
    }
  })

  variableGroups.forEach((group, parentPath) => {
    const occurrences = group.map((v) => v.occurrences)
    const maxOccurrences = Math.max(...occurrences, 0)

    group.forEach((variable) => {
      if (variable.occurrences < maxOccurrences) {
        const missingPercentage = ((maxOccurrences - variable.occurrences) / maxOccurrences) * 100
        issues.push({
          path: variable.variableName,
          severity: missingPercentage > 50 ? "error" : "warning",
          type: "missing_values",
          message: `Missing in ${
            maxOccurrences - variable.occurrences
          } of ${maxOccurrences} occurrences (${missingPercentage.toFixed(1)}%)`,
        })
      }
    })
  })

  return issues
}

/**
 * Comprehensive structure validation
 */
export function validateStructures(
  variables: ExtractedVariable[],
  options?: {
    maxRecommendedDepth?: number
  }
): ValidationResult {
  const maxDepth = options?.maxRecommendedDepth ?? 5

  const allIssues = [
    ...validateTypeConsistency(variables),
    ...checkDataQuality(variables, maxDepth),
    ...detectComplexNesting(variables),
    ...detectMissingValues(variables),
  ]

  const warnings = allIssues.filter((i) => i.severity === "warning")
  const errors = allIssues.filter((i) => i.severity === "error")

  return {
    isValid: errors.length === 0,
    issues: allIssues,
    warnings,
    errors,
  }
}
