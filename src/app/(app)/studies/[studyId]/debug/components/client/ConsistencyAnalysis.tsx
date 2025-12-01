"use client"

import type { EnrichedJatosStudyResult } from "@/src/types/jatos"
import type { OriginalStructureAnalysis } from "../../../variables/utils/structureAnalyzer/analyzeOriginalStructure"
import { analyzeOriginalConsistency } from "../../../variables/utils/structureAnalyzer/analyzeOriginalConsistency"
import { validateOriginalStructure } from "../../../variables/utils/structureAnalyzer/validateOriginalStructure"
import { Alert } from "@/src/app/components/Alert"
import Card from "@/src/app/components/Card"
import { useMemo, useState } from "react"
import {
  matchConsistencyIssueWithRecommendation,
  filterRecommendationsByCategory,
} from "./utils/matchRecommendations"

interface ConsistencyAnalysisProps {
  enrichedResult: EnrichedJatosStudyResult
  originalStructureAnalysis: OriginalStructureAnalysis
}

export default function ConsistencyAnalysis({
  enrichedResult,
  originalStructureAnalysis,
}: ConsistencyAnalysisProps) {
  const { components, recommendations } = originalStructureAnalysis

  // Component selection for consistency analysis
  const availableComponents = components.filter(
    (c) => c.structureType !== "null" && c.structureType !== "empty"
  )
  const [selectedComponentsForConsistency, setSelectedComponentsForConsistency] = useState<
    number[]
  >(availableComponents.map((c) => c.componentId))

  // Recalculate consistency when selection changes
  const consistencyReport = useMemo(
    () =>
      analyzeOriginalConsistency(
        enrichedResult,
        components,
        selectedComponentsForConsistency.length > 0 ? selectedComponentsForConsistency : undefined
      ),
    [enrichedResult, components, selectedComponentsForConsistency]
  )

  // Recalculate validation with selected components
  const validation = useMemo(
    () =>
      validateOriginalStructure(enrichedResult, components, {
        selectedComponentIds: selectedComponentsForConsistency,
      }),
    [enrichedResult, components, selectedComponentsForConsistency]
  )

  // Filter consistency-related recommendations
  const consistencyRecommendations = useMemo(
    () => filterRecommendationsByCategory(recommendations, "consistency"),
    [recommendations]
  )

  // Separate cross-component issues (only when 2+ components selected) from internal issues
  const crossComponentIssues = useMemo(() => {
    // Cross-component checks only make sense when comparing 2+ components
    if (selectedComponentsForConsistency.length < 2) {
      return []
    }
    // Filter out internal consistency issues (they have componentId and are array_uniformity or internal_inconsistency)
    return validation.consistencyIssues.filter(
      (issue) =>
        !issue.componentId ||
        (issue.issue !== "array_uniformity" && issue.issue !== "internal_inconsistency")
    )
  }, [validation.consistencyIssues, selectedComponentsForConsistency.length])

  // Match cross-component issues with recommendations
  const crossComponentIssuesWithRecommendations = useMemo(() => {
    return crossComponentIssues.map((issue) => ({
      issue,
      recommendation: matchConsistencyIssueWithRecommendation(issue, recommendations),
    }))
  }, [crossComponentIssues, recommendations])

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card title="Consistency Summary" defaultOpen={true}>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span
              className={`badge badge-lg ${
                consistencyReport.isConsistent ? "badge-success" : "badge-warning"
              }`}
            >
              {consistencyReport.isConsistent ? "Consistent" : "Inconsistent"}
            </span>
            <span className="text-sm text-muted-content">
              {selectedComponentsForConsistency.length >= 2
                ? `${crossComponentIssues.length} cross-component issue(s), `
                : ""}
              {consistencyReport.internalConsistency
                ? Array.from(consistencyReport.internalConsistency.values()).reduce(
                    (sum, report) => sum + report.issues.length,
                    0
                  )
                : 0}{" "}
              internal issue(s) found
            </span>
          </div>
        </div>
      </Card>

      {/* Component Selection */}
      <Card title="Component Selection" defaultOpen={true}>
        <div>
          <label className="label">
            <span className="label-text font-semibold text-sm">Select Components to Compare</span>
          </label>
          <div className="flex flex-wrap gap-3 mt-2">
            {availableComponents.map((component) => (
              <label
                key={component.componentId}
                className="label cursor-pointer gap-2 p-2 rounded hover:bg-base-300 transition-colors"
              >
                <input
                  type="checkbox"
                  className="checkbox checkbox-primary checkbox-sm"
                  checked={selectedComponentsForConsistency.includes(component.componentId)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedComponentsForConsistency([
                        ...selectedComponentsForConsistency,
                        component.componentId,
                      ])
                    } else {
                      setSelectedComponentsForConsistency(
                        selectedComponentsForConsistency.filter(
                          (id) => id !== component.componentId
                        )
                      )
                    }
                  }}
                />
                <span className="label-text text-sm">
                  Component {component.componentId}
                  <span className="text-xs text-muted-content ml-1">
                    ({component.structureType})
                  </span>
                </span>
              </label>
            ))}
          </div>
          {selectedComponentsForConsistency.length === 0 && (
            <Alert variant="info" className="mt-2">
              <div className="text-xs">Select at least one component to analyze consistency</div>
            </Alert>
          )}
        </div>
      </Card>

      {selectedComponentsForConsistency.length > 0 && (
        <>
          {/* Cross-Component Consistency Checks - only show if 2+ components selected */}
          {selectedComponentsForConsistency.length >= 2 && (
            <>
              {crossComponentIssuesWithRecommendations.length > 0 && (
                <Card title="Cross-Component Consistency Checks" defaultOpen={true}>
                  <div className="space-y-4">
                    {crossComponentIssuesWithRecommendations.map(
                      ({ issue, recommendation }, idx) => (
                        <div key={idx} className="space-y-2">
                          <Alert variant="warning" className="py-2">
                            <div className="flex items-start gap-2">
                              <span className="badge badge-xs badge-warning">Check</span>
                              <div className="flex-1">
                                <div className="text-sm font-semibold mb-1">{issue.path}</div>
                                <div className="text-xs">{issue.description}</div>
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
                                        {recommendation.affectedComponents
                                          .slice(0, 3)
                                          .map((compId, pIdx) => (
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
                      )
                    )}
                  </div>
                </Card>
              )}

              {/* Cross-Component Consistency Summary */}
              <Card title="Cross-Component Consistency Summary" defaultOpen={true}>
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`badge badge-lg ${
                      consistencyReport.isConsistent ? "badge-success" : "badge-warning"
                    }`}
                  >
                    {consistencyReport.isConsistent ? "Consistent" : "Inconsistent"}
                  </span>
                  <span className="text-sm text-muted-content">
                    {crossComponentIssues.length} issue(s) found
                  </span>
                </div>
              </Card>
            </>
          )}

          {/* Show message when only one component is selected */}
          {selectedComponentsForConsistency.length === 1 && (
            <Alert variant="info">
              <div className="text-xs">
                Select 2 or more components to compare cross-component consistency. Internal
                consistency will be shown below if applicable.
              </div>
            </Alert>
          )}

          {/* Internal Consistency */}
          {consistencyReport.internalConsistency &&
            consistencyReport.internalConsistency.size > 0 && (
              <Card title="Internal Consistency (Within Components)" defaultOpen={true}>
                <div className="space-y-3">
                  {Array.from(consistencyReport.internalConsistency.entries()).map(
                    ([componentId, internalReport]) => (
                      <div key={componentId} className="border border-base-300 rounded p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-sm">Component {componentId}</span>
                          <span
                            className={`badge badge-sm ${
                              internalReport.isConsistent ? "badge-success" : "badge-warning"
                            }`}
                          >
                            {internalReport.isConsistent ? "Consistent" : "Inconsistent"}
                          </span>
                        </div>
                        {internalReport.issues.length > 0 && (
                          <div className="space-y-2">
                            {internalReport.issues.map((issue, idx) => (
                              <Alert key={idx} variant="warning" className="py-2">
                                <div className="text-xs">
                                  <span className="font-mono font-semibold">{issue.path}</span>
                                  <span className="ml-2 text-muted-content">
                                    {issue.description}
                                  </span>
                                </div>
                              </Alert>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  )}
                </div>
              </Card>
            )}

          {/* General Consistency Recommendations */}
          {consistencyRecommendations.length > 0 && (
            <Card title="General Recommendations" defaultOpen={false}>
              <div className="space-y-2">
                {consistencyRecommendations.map((rec, idx) => (
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
        </>
      )}
    </div>
  )
}
