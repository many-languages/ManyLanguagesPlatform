/**
 * Utility to match validation issues with recommendations
 */

import type { OriginalValidationIssue } from "../../../../variables/utils/structureAnalyzer/validateOriginalStructure"
import type { OriginalRecommendation } from "../../../../variables/utils/structureAnalyzer/generateOriginalRecommendations"
import type { ConsistencyIssue } from "../../../../variables/utils/structureAnalyzer/consistencyChecks"
import type { DataQualityIssue } from "../../../../variables/utils/structureAnalyzer/dataQualityChecks"

/**
 * Match a validation issue with its corresponding recommendation
 */
export function matchIssueWithRecommendation(
  issue: OriginalValidationIssue,
  recommendations: OriginalRecommendation[]
): OriginalRecommendation | null {
  // Direct type-based matching based on generateOriginalRecommendations logic
  switch (issue.type) {
    case "parse_error": {
      const rec = recommendations.find((r) => r.message.includes("parse error"))
      if (rec && (!issue.componentId || rec.affectedComponents?.includes(issue.componentId))) {
        return rec
      }
      break
    }
    case "excessive_depth": {
      const rec = recommendations.find(
        (r) =>
          r.message.toLowerCase().includes("deep nesting") ||
          r.message.toLowerCase().includes("flattening")
      )
      if (rec && (!issue.componentId || rec.affectedComponents?.includes(issue.componentId))) {
        return rec
      }
      break
    }
    case "complex_nesting": {
      const rec = recommendations.find((r) => r.message.toLowerCase().includes("complex nesting"))
      if (rec && (!issue.componentId || rec.affectedComponents?.includes(issue.componentId))) {
        return rec
      }
      break
    }
    case "extraction_issue": {
      const rec = recommendations.find(
        (r) =>
          r.message.toLowerCase().includes("extraction") ||
          r.message.toLowerCase().includes("skipped")
      )
      if (rec && (!issue.componentId || rec.affectedComponents?.includes(issue.componentId))) {
        return rec
      }
      break
    }
    case "missing_data":
    case "empty_structure": {
      const rec = recommendations.find(
        (r) =>
          r.message.toLowerCase().includes("empty") || r.message.toLowerCase().includes("no data")
      )
      if (rec && (!issue.componentId || rec.affectedComponents?.includes(issue.componentId))) {
        return rec
      }
      break
    }
    case "missing_in_some":
    case "type_mismatch":
    case "structure_variation":
    case "depth_variation":
    case "internal_inconsistency":
    case "array_item_variation":
    case "array_uniformity": {
      const rec = recommendations.find(
        (r) =>
          r.message.toLowerCase().includes("consistency") ||
          r.message.toLowerCase().includes("different structures")
      )
      if (rec) {
        if (
          !issue.componentId ||
          rec.affectedComponents?.includes(issue.componentId) ||
          rec.affectedComponents === undefined ||
          rec.affectedComponents.length === 0
        ) {
          return rec
        }
      }
      break
    }
  }

  return null
}

/**
 * Match a consistency issue with its corresponding recommendation
 */
export function matchConsistencyIssueWithRecommendation(
  issue: ConsistencyIssue,
  recommendations: OriginalRecommendation[]
): OriginalRecommendation | null {
  // Convert consistency issue to validation issue format for matching
  const validationIssue: OriginalValidationIssue = {
    componentId: issue.componentId,
    path: issue.path,
    severity: "warning",
    type: issue.issue as OriginalValidationIssue["type"],
    message: issue.description,
  }
  return matchIssueWithRecommendation(validationIssue, recommendations)
}

/**
 * Match a data quality issue with its corresponding recommendation
 */
export function matchDataQualityIssueWithRecommendation(
  issue: DataQualityIssue,
  recommendations: OriginalRecommendation[]
): OriginalRecommendation | null {
  // Convert data quality issue to validation issue format for matching
  const validationIssue: OriginalValidationIssue = {
    componentId: issue.componentId,
    path: issue.path,
    severity: issue.severity,
    type: issue.type as OriginalValidationIssue["type"],
    message: issue.message,
  }
  return matchIssueWithRecommendation(validationIssue, recommendations)
}

/**
 * Filter recommendations by category (consistency vs data quality)
 */
export function filterRecommendationsByCategory(
  recommendations: OriginalRecommendation[],
  category: "consistency" | "dataQuality"
): OriginalRecommendation[] {
  if (category === "consistency") {
    return recommendations.filter(
      (r) =>
        r.message.toLowerCase().includes("consistency") ||
        r.message.toLowerCase().includes("different structures") ||
        r.message.toLowerCase().includes("missing keys")
    )
  } else {
    // dataQuality
    return recommendations.filter(
      (r) =>
        r.message.toLowerCase().includes("parse") ||
        r.message.toLowerCase().includes("depth") ||
        r.message.toLowerCase().includes("nesting") ||
        r.message.toLowerCase().includes("extraction") ||
        r.message.toLowerCase().includes("empty") ||
        r.message.toLowerCase().includes("no data") ||
        r.message.toLowerCase().includes("flattening")
    )
  }
}
