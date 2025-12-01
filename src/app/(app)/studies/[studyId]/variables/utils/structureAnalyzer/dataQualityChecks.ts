/**
 * Data Quality Checks (Level 1)
 * Pure check functions for data quality and validation issues
 */

import type { ComponentStructureAnalysis } from "./analyzeOriginalStructure"
import type { EnrichedJatosStudyResult } from "@/src/types/jatos"
import { analyzeArrayContent, predictExtractionIssues } from "../shared/arrayPatternDetection"

export interface DataQualityIssue {
  componentId?: number
  path: string
  severity: "warning" | "error"
  type:
    | "excessive_depth"
    | "complex_nesting"
    | "parse_error"
    | "missing_data"
    | "empty_structure"
    | "extraction_issue"
  message: string
}

/**
 * Check for excessive nesting depth
 */
export function checkDepth(
  components: ComponentStructureAnalysis[],
  maxRecommendedDepth = 5
): DataQualityIssue[] {
  const issues: DataQualityIssue[] = []

  components.forEach((component) => {
    if (component.maxDepth > maxRecommendedDepth) {
      issues.push({
        componentId: component.componentId,
        path: `component_${component.componentId}`,
        severity: "warning",
        type: "excessive_depth",
        message: `Component ${component.componentId} has depth ${component.maxDepth}, which may indicate overly complex structure`,
      })
    }
  })

  return issues
}

/**
 * Detect complex nesting patterns (nested arrays, deep object nesting)
 */
export function detectComplexNesting(
  enrichedResult: EnrichedJatosStudyResult,
  components: ComponentStructureAnalysis[],
  maxRecommendedDepth = 5
): DataQualityIssue[] {
  const issues: DataQualityIssue[] = []

  components.forEach((component) => {
    const componentData = enrichedResult.componentResults.find(
      (c) => c.componentId === component.componentId
    )?.parsedData

    if (!componentData) return

    // Check for nested arrays using shared utility
    const checkForNestedArrays = (data: any, depth = 0): boolean => {
      if (depth > 10) return false // Prevent infinite recursion

      if (Array.isArray(data)) {
        const analysis = analyzeArrayContent(data)
        if (analysis.hasNestedArrays) return true
        // Recursively check nested objects within array items
        return data.some(
          (item) =>
            typeof item === "object" &&
            item !== null &&
            !Array.isArray(item) &&
            checkForNestedArrays(item, depth + 1)
        )
      }

      if (typeof data === "object" && data !== null) {
        return Object.values(data).some((value) => checkForNestedArrays(value, depth + 1))
      }

      return false
    }

    const hasNestedArrays = checkForNestedArrays(componentData)
    if (hasNestedArrays) {
      issues.push({
        componentId: component.componentId,
        path: `component_${component.componentId}`,
        severity: "warning",
        type: "complex_nesting",
        message: `Component ${component.componentId} contains nested arrays, which may be difficult to work with`,
      })
    }

    // Check for very deep object nesting (using same threshold as checkDepth)
    if (component.maxDepth > maxRecommendedDepth) {
      issues.push({
        componentId: component.componentId,
        path: `component_${component.componentId}`,
        severity: "warning",
        type: "complex_nesting",
        message: `Component ${component.componentId} has deep object nesting (${component.maxDepth} levels)`,
      })
    }
  })

  return issues
}

/**
 * Check for parse errors
 */
export function checkParseErrors(enrichedResult: EnrichedJatosStudyResult): DataQualityIssue[] {
  const issues: DataQualityIssue[] = []

  enrichedResult.componentResults.forEach((component) => {
    if (component.parseError) {
      issues.push({
        componentId: component.componentId,
        path: `component_${component.componentId}`,
        severity: "error",
        type: "parse_error",
        message: `Parse error in component ${component.componentId}: ${component.parseError}`,
      })
    }
  })

  return issues
}

/**
 * Check for missing or empty data
 */
export function checkMissingData(components: ComponentStructureAnalysis[]): DataQualityIssue[] {
  const issues: DataQualityIssue[] = []

  components.forEach((component) => {
    if (component.structureType === "null") {
      issues.push({
        componentId: component.componentId,
        path: `component_${component.componentId}`,
        severity: "warning",
        type: "missing_data",
        message: `Component ${component.componentId} has no data (null)`,
      })
    } else if (component.structureType === "empty") {
      issues.push({
        componentId: component.componentId,
        path: `component_${component.componentId}`,
        severity: "warning",
        type: "empty_structure",
        message: `Component ${component.componentId} has empty structure`,
      })
    }
  })

  return issues
}

/**
 * Check for structures that will cause extraction issues
 */
export function checkExtractionIssues(
  enrichedResult: EnrichedJatosStudyResult,
  components: ComponentStructureAnalysis[]
): DataQualityIssue[] {
  const issues: DataQualityIssue[] = []

  enrichedResult.componentResults.forEach((componentResult) => {
    if (!componentResult.parsedData) return

    const componentAnalysis = components.find((c) => c.componentId === componentResult.componentId)
    if (!componentAnalysis || componentAnalysis.structureType !== "array") return

    const data = componentResult.parsedData
    if (Array.isArray(data) && data.length > 0) {
      const prediction = predictExtractionIssues(data, `component_${componentResult.componentId}`)
      if (prediction.willHaveIssues) {
        // Convert prediction issues to data quality issues
        prediction.issues.forEach((issue) => {
          issues.push({
            componentId: componentResult.componentId,
            path: `component_${componentResult.componentId}`,
            severity: issue.severity,
            type: "extraction_issue",
            message: issue.message,
          })
        })
      }
    }
  })

  return issues
}
