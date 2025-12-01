/**
 * Original Structure Validation (Level 2)
 * Orchestrates all checks and aggregates results
 */

import type { ComponentStructureAnalysis } from "./analyzeOriginalStructure"
import type { EnrichedJatosStudyResult } from "@/src/types/jatos"
import * as consistencyChecks from "./consistencyChecks"
import * as dataQualityChecks from "./dataQualityChecks"

export interface OriginalValidationIssue {
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
    | "missing_in_some"
    | "type_mismatch"
    | "structure_variation"
    | "depth_variation"
    | "internal_inconsistency"
    | "array_item_variation"
    | "array_uniformity"
  message: string
}

export interface OriginalValidationResult {
  isValid: boolean
  issues: OriginalValidationIssue[]
  warnings: OriginalValidationIssue[]
  errors: OriginalValidationIssue[]
  consistencyIssues: consistencyChecks.ConsistencyIssue[]
  dataQualityIssues: dataQualityChecks.DataQualityIssue[]
}

/**
 * Comprehensive validation of original structure
 * Orchestrates all Level 1 checks and aggregates results
 */
export function validateOriginalStructure(
  enrichedResult: EnrichedJatosStudyResult,
  components: ComponentStructureAnalysis[],
  options?: {
    maxRecommendedDepth?: number
    selectedComponentIds?: number[] // For consistency checks
  }
): OriginalValidationResult {
  const maxDepth = options?.maxRecommendedDepth ?? 5
  const selectedComponentIds =
    options?.selectedComponentIds ??
    components
      .filter((c) => c.structureType !== "null" && c.structureType !== "empty")
      .map((c) => c.componentId)

  // Run all data quality checks
  const dataQualityIssues = [
    ...dataQualityChecks.checkDepth(components, maxDepth),
    ...dataQualityChecks.detectComplexNesting(enrichedResult, components, maxDepth),
    ...dataQualityChecks.checkParseErrors(enrichedResult),
    ...dataQualityChecks.checkMissingData(components),
    ...dataQualityChecks.checkExtractionIssues(enrichedResult, components),
  ]

  // Run cross-component consistency checks only when 2+ components are selected
  // (These checks only make sense when comparing multiple components)
  const consistencyIssues: consistencyChecks.ConsistencyIssue[] = []
  if (selectedComponentIds.length >= 2) {
    consistencyIssues.push(
      ...consistencyChecks.checkKeyConsistency(components, selectedComponentIds),
      ...consistencyChecks.detectTypeMismatches(components, selectedComponentIds),
      ...consistencyChecks.findStructuralVariations(components, selectedComponentIds)
    )
  }

  // Convert consistency issues to validation issues format
  const allIssues: OriginalValidationIssue[] = [
    ...dataQualityIssues.map((issue) => ({
      componentId: issue.componentId,
      path: issue.path,
      severity: issue.severity,
      type: issue.type as OriginalValidationIssue["type"],
      message: issue.message,
    })),
    ...consistencyIssues.map((issue) => ({
      componentId: issue.componentId,
      path: issue.path,
      severity: "warning" as const, // Consistency issues are warnings
      type: issue.issue as OriginalValidationIssue["type"],
      message: issue.description,
    })),
  ]

  const warnings = allIssues.filter((i) => i.severity === "warning")
  const errors = allIssues.filter((i) => i.severity === "error")

  return {
    isValid: errors.length === 0,
    issues: allIssues,
    warnings,
    errors,
    consistencyIssues,
    dataQualityIssues,
  }
}
