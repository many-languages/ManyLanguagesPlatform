/**
 * Original Structure Recommendations (Level 3)
 * Structures user feedback based on validation results and patterns
 * No checks performed here - only formatting recommendations
 */

import type { ComponentStructureAnalysis } from "./analyzeComponentStructure"
import type { OriginalConsistencyReport } from "./analyzeOriginalConsistency"
import type { OriginalValidationResult } from "./validateOriginalStructure"
import type { OriginalDetectedPattern } from "./detectOriginalPatterns"

export interface OriginalRecommendation {
  type: "info" | "warning" | "suggestion"
  message: string
  affectedComponents?: number[]
}

/**
 * Generate recommendations based on validation results and patterns
 * This function only structures feedback - no checks are performed
 */
export function generateOriginalRecommendations(
  components: ComponentStructureAnalysis[],
  statistics: {
    maxNestingDepth: number
    componentsWithData: number
  },
  consistency: OriginalConsistencyReport,
  validation: OriginalValidationResult,
  patterns: OriginalDetectedPattern[]
): OriginalRecommendation[] {
  const recommendations: OriginalRecommendation[] = []

  // Recommendations from validation errors
  if (validation.errors.some((e) => e.type === "parse_error")) {
    const errorComponents = validation.errors
      .filter((e) => e.type === "parse_error" && e.componentId)
      .map((e) => e.componentId!)
    recommendations.push({
      type: "warning",
      message: `${errorComponents.length} component(s) have parse errors. Review data format.`,
      affectedComponents: errorComponents,
    })
  }

  // Recommendations from validation warnings - excessive depth
  const depthIssues = validation.warnings.filter((w) => w.type === "excessive_depth")
  if (depthIssues.length > 0) {
    const deepComponents = depthIssues
      .map((i) => i.componentId)
      .filter((id): id is number => id !== undefined)
    recommendations.push({
      type: "warning",
      message: `Deep nesting detected (max depth: ${statistics.maxNestingDepth}). Consider flattening the structure if possible.`,
      affectedComponents: deepComponents.slice(0, 5),
    })
  }

  // Recommendations from validation warnings - complex nesting
  const nestingIssues = validation.warnings.filter((w) => w.type === "complex_nesting")
  if (nestingIssues.length > 0) {
    const nestedComponents = nestingIssues
      .map((i) => i.componentId)
      .filter((id): id is number => id !== undefined)
    recommendations.push({
      type: "warning",
      message: `${nestedComponents.length} component(s) have complex nesting patterns (nested arrays or deep object nesting).`,
      affectedComponents: nestedComponents.slice(0, 5),
    })
  }

  // Recommendations from validation warnings - extraction issues
  const extractionIssues = validation.warnings.filter((w) => w.type === "extraction_issue")
  if (extractionIssues.length > 0) {
    const extractionComponents = new Set(
      extractionIssues.map((i) => i.componentId).filter((id): id is number => id !== undefined)
    )
    recommendations.push({
      type: "warning",
      message: `${extractionComponents.size} component(s) have structures that will cause values to be skipped during variable extraction.`,
      affectedComponents: Array.from(extractionComponents).slice(0, 5),
    })
  }

  // Recommendations from consistency issues
  if (!consistency.isConsistent && consistency.issues.length > 0) {
    const inconsistentComponents = new Set<number>()
    consistency.issues.forEach((issue) => {
      if (issue.componentId) {
        inconsistentComponents.add(issue.componentId)
      }
    })
    recommendations.push({
      type: "warning",
      message: `${consistency.issues.length} consistency issue(s) found. Components have different structures or missing keys.`,
      affectedComponents: Array.from(inconsistentComponents).slice(0, 5),
    })
  }

  // Recommendations from validation warnings - missing/empty data
  const missingDataIssues = validation.warnings.filter(
    (w) => w.type === "missing_data" || w.type === "empty_structure"
  )
  if (missingDataIssues.length > 0) {
    const emptyComponents = missingDataIssues
      .map((i) => i.componentId)
      .filter((id): id is number => id !== undefined)
    recommendations.push({
      type: "info",
      message: `${emptyComponents.length} component(s) are empty or have no data.`,
      affectedComponents: emptyComponents,
    })
  }

  // Recommendations from patterns - mixed patterns
  const patternTypes = new Set(patterns.map((p) => p.type))
  if (patternTypes.size > 2 && !patternTypes.has("inconsistent")) {
    recommendations.push({
      type: "info",
      message:
        "Mixed structure patterns detected. Consider standardizing the data format for easier analysis.",
    })
  }

  // Recommendations from patterns - inconsistent patterns
  if (patterns.some((p) => p.type === "inconsistent")) {
    recommendations.push({
      type: "warning",
      message:
        "Components have inconsistent structure types. This may cause issues during variable extraction.",
    })
  }

  // Recommendations from patterns - array patterns
  if (patterns.some((p) => p.type === "array_of_objects")) {
    recommendations.push({
      type: "info",
      message:
        "Array of objects pattern detected. Variables will be extracted using array notation (e.g., trials[*].rt).",
    })
  }

  // Suggestions based on statistics
  const nestedComponents = components.filter((c) => c.maxDepth > 1)
  if (nestedComponents.length > 3) {
    recommendations.push({
      type: "suggestion",
      message: `Consider grouping ${nestedComponents.length} components with nested structures for easier management.`,
    })
  }

  return recommendations
}
