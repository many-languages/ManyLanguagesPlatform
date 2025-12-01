"use client"

import type { OriginalStructureAnalysis } from "../../../variables/utils/structureAnalyzer/analyzeOriginalStructure"
import type { ExtractionResult } from "../../../variables/types"
import Card from "@/src/app/components/Card"
import { Alert } from "@/src/app/components/Alert"
import { useMemo } from "react"
import {
  matchDataQualityIssueWithRecommendation,
  filterRecommendationsByCategory,
} from "./utils/matchRecommendations"

interface DataQualityAnalysisProps {
  originalStructureAnalysis: OriginalStructureAnalysis
  extractionResult?: ExtractionResult
}

export default function DataQualityAnalysis({
  originalStructureAnalysis,
  extractionResult,
}: DataQualityAnalysisProps) {
  const { validation, recommendations } = originalStructureAnalysis

  // Filter data quality-related recommendations
  const dataQualityRecommendations = useMemo(
    () => filterRecommendationsByCategory(recommendations, "dataQuality"),
    [recommendations]
  )

  // Match data quality issues with recommendations
  const issuesWithRecommendations = useMemo(() => {
    return validation.dataQualityIssues.map((issue) => ({
      issue,
      recommendation: matchDataQualityIssueWithRecommendation(issue, recommendations),
    }))
  }, [validation.dataQualityIssues, recommendations])

  // Separate errors and warnings
  const errorsWithRecs = useMemo(
    () => issuesWithRecommendations.filter(({ issue }) => issue.severity === "error"),
    [issuesWithRecommendations]
  )
  const warningsWithRecs = useMemo(
    () => issuesWithRecommendations.filter(({ issue }) => issue.severity === "warning"),
    [issuesWithRecommendations]
  )

  // Get extraction errors
  const extractionErrors =
    extractionResult?.skippedValues.filter((s) => s.severity === "error") || []

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card title="Data Quality Summary" defaultOpen={true}>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span
              className={`badge badge-lg ${
                validation.errors.filter((e) =>
                  validation.dataQualityIssues.some(
                    (dq) => dq.severity === "error" && dq.path === e.path
                  )
                ).length === 0
                  ? "badge-success"
                  : "badge-error"
              }`}
            >
              {validation.errors.filter((e) =>
                validation.dataQualityIssues.some(
                  (dq) => dq.severity === "error" && dq.path === e.path
                )
              ).length === 0
                ? "Valid"
                : "Issues Found"}
            </span>
            <span className="text-sm text-muted-content">
              {errorsWithRecs.length} error(s), {warningsWithRecs.length} warning(s)
            </span>
          </div>
        </div>
      </Card>

      {/* Errors Section */}
      {errorsWithRecs.length > 0 && (
        <Card title="Errors" defaultOpen={true}>
          <div className="space-y-4">
            {errorsWithRecs.map(({ issue, recommendation }, idx) => (
              <div key={idx} className="space-y-2">
                <Alert variant="error" className="py-2">
                  <div className="flex items-start gap-2">
                    <span className="badge badge-xs badge-error">Check</span>
                    <div className="flex-1">
                      <div className="text-sm font-semibold mb-1">{issue.path}</div>
                      <div className="text-xs">{issue.message}</div>
                      {issue.componentId && (
                        <div className="mt-1">
                          <span className="badge badge-xs font-mono">
                            Component {issue.componentId}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </Alert>
                {recommendation && (
                  <Alert
                    variant={recommendation.type === "warning" ? "warning" : "info"}
                    className="py-2 ml-4 border-l-2 border-l-primary"
                  >
                    <div className="flex items-start gap-2">
                      <span className="badge badge-xs badge-ghost">Recommendation</span>
                      <div className="flex-1">
                        <div className="text-sm">{recommendation.message}</div>
                        {recommendation.affectedComponents &&
                          recommendation.affectedComponents.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {recommendation.affectedComponents.slice(0, 3).map((compId, pIdx) => (
                                <span key={pIdx} className="badge badge-xs font-mono">
                                  Component {compId}
                                </span>
                              ))}
                            </div>
                          )}
                      </div>
                    </div>
                  </Alert>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Warnings Section */}
      {warningsWithRecs.length > 0 && (
        <Card title="Warnings" defaultOpen={true}>
          <div className="space-y-4">
            {warningsWithRecs.map(({ issue, recommendation }, idx) => (
              <div key={idx} className="space-y-2">
                <Alert variant="warning" className="py-2">
                  <div className="flex items-start gap-2">
                    <span className="badge badge-xs badge-warning">Check</span>
                    <div className="flex-1">
                      <div className="text-sm font-semibold mb-1">{issue.path}</div>
                      <div className="text-xs">{issue.message}</div>
                      {issue.componentId && (
                        <div className="mt-1">
                          <span className="badge badge-xs font-mono">
                            Component {issue.componentId}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </Alert>
                {recommendation && (
                  <Alert
                    variant={recommendation.type === "warning" ? "warning" : "info"}
                    className="py-2 ml-4 border-l-2 border-l-primary"
                  >
                    <div className="flex items-start gap-2">
                      <span className="badge badge-xs badge-ghost">Recommendation</span>
                      <div className="flex-1">
                        <div className="text-sm">{recommendation.message}</div>
                        {recommendation.affectedComponents &&
                          recommendation.affectedComponents.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {recommendation.affectedComponents.slice(0, 3).map((compId, pIdx) => (
                                <span key={pIdx} className="badge badge-xs font-mono">
                                  Component {compId}
                                </span>
                              ))}
                            </div>
                          )}
                      </div>
                    </div>
                  </Alert>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Extraction Issues */}
      {extractionErrors.length > 0 && (
        <Card title="Extraction Issues" defaultOpen={true}>
          <Alert variant="error" className="py-2">
            <div className="flex items-start gap-2">
              <span className="badge badge-xs badge-error">Extraction</span>
              <div className="flex-1">
                <div className="text-sm font-semibold mb-1">
                  {extractionErrors.length} value(s) were skipped during extraction
                </div>
                <div className="text-xs text-muted-content mb-2">
                  These values could not be extracted as variables. See details in the Variable
                  Extraction Preview below.
                </div>
                <div className="flex flex-wrap gap-1">
                  {Array.from(new Set(extractionErrors.map((s) => s.reason)))
                    .slice(0, 5)
                    .map((reason, idx) => (
                      <span key={idx} className="badge badge-xs badge-error">
                        {reason.replace(/_/g, " ")}
                      </span>
                    ))}
                </div>
              </div>
            </div>
          </Alert>
        </Card>
      )}

      {/* General Data Quality Recommendations */}
      {dataQualityRecommendations.length > 0 && (
        <Card title="General Recommendations" defaultOpen={false}>
          <div className="space-y-2">
            {dataQualityRecommendations
              .filter((rec) => {
                // Filter out recommendations that were already matched to issues
                const isMatched = issuesWithRecommendations.some(
                  ({ recommendation }) => recommendation === rec
                )
                return !isMatched
              })
              .map((rec, idx) => (
                <Alert
                  key={idx}
                  variant={rec.type === "warning" ? "warning" : "info"}
                  className="py-2"
                >
                  <div className="flex items-start gap-2">
                    <span className="badge badge-xs badge-ghost">
                      {rec.type === "suggestion" ? "Suggestion" : "Info"}
                    </span>
                    <div className="flex-1">
                      <div className="text-sm">{rec.message}</div>
                      {rec.affectedComponents && rec.affectedComponents.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {rec.affectedComponents.slice(0, 3).map((compId, pIdx) => (
                            <span key={pIdx} className="badge badge-xs font-mono">
                              Component {compId}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </Alert>
              ))}
          </div>
        </Card>
      )}

      {/* No Issues Message */}
      {errorsWithRecs.length === 0 && warningsWithRecs.length === 0 && (
        <Card title="Data Quality Results" defaultOpen={true}>
          <Alert variant="info">
            <div className="text-sm">No data quality issues found. Structure looks good!</div>
          </Alert>
        </Card>
      )}
    </div>
  )
}
