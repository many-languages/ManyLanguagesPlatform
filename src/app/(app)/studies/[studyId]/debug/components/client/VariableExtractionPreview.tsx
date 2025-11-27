"use client"

import type { EnrichedJatosStudyResult } from "@/src/types/jatos"
import { extractVariables } from "../../../variables/utils/extractVariable"
import { analyzeStructure } from "../../../variables/utils/structureAnalyzer"
import Card from "@/src/app/components/Card"
import Modal from "@/src/app/components/Modal"
import { useState, useEffect, useMemo } from "react"
import type { ExtractedVariable } from "../../../variables/types"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneLight, vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism"

interface VariableExtractionPreviewProps {
  enrichedResult: EnrichedJatosStudyResult
}

export default function VariableExtractionPreview({
  enrichedResult,
}: VariableExtractionPreviewProps) {
  const extractedVariables = extractVariables(enrichedResult)
  const structureAnalysis = useMemo(
    () => analyzeStructure(extractedVariables),
    [extractedVariables]
  )
  const [selectedVariable, setSelectedVariable] = useState<ExtractedVariable | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDark, setIsDark] = useState(false)
  const [analysisTab, setAnalysisTab] = useState<
    "statistics" | "patterns" | "validation" | "recommendations"
  >("statistics")

  // Detect theme from document
  useEffect(() => {
    const checkTheme = () => {
      const theme = document.documentElement.getAttribute("data-theme")
      setIsDark(
        theme === "dark" || (!theme && window.matchMedia("(prefers-color-scheme: dark)").matches)
      )
    }

    checkTheme()
    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    })

    return () => observer.disconnect()
  }, [])

  // Get unique data structures from all variables
  const uniqueDataStructures = Array.from(new Set(extractedVariables.map((v) => v.dataStructure)))

  const getTypeTooltip = (type: "primitive" | "object" | "array"): string => {
    switch (type) {
      case "primitive":
        return "primitive values (string, number, boolean, null, undefined)"
      case "object":
        return "objects (non-null objects)"
      case "array":
        return "arrays"
      default:
        return ""
    }
  }

  const handleShowValues = (variable: ExtractedVariable) => {
    setSelectedVariable(variable)
    setIsModalOpen(true)
  }

  const formatValueForDisplay = (value: any): string => {
    if (value === null) return "null"
    if (value === undefined) return "undefined"
    if (typeof value === "object") {
      try {
        return JSON.stringify(value, null, 2)
      } catch {
        return String(value)
      }
    }
    return String(value)
  }

  return (
    <Card title="Variable Extraction Preview" collapsible defaultOpen={true}>
      <div className="stats shadow mb-4">
        <div className="stat">
          <div className="stat-title">Variables Extracted</div>
          <div className="stat-value text-primary">{extractedVariables.length}</div>
        </div>
        <div className="stat">
          <div className="stat-title">Total Occurrences</div>
          <div className="stat-value text-secondary">
            {extractedVariables.reduce((sum, v) => sum + v.occurrences, 0)}
          </div>
        </div>
        <div className="stat">
          <div className="stat-title">Data Structure</div>
          <div className="stat-value">
            {uniqueDataStructures.length > 0 ? (
              <div className="flex gap-2 flex-wrap">
                {uniqueDataStructures.map((ds) => (
                  <span key={ds} className="badge badge-lg badge-ghost uppercase">
                    {ds}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-base-content/60">N/A</span>
            )}
          </div>
        </div>
      </div>

      {extractedVariables.length === 0 ? (
        <div className="alert alert-info">
          <span>No variables extracted from this result</span>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="table table-zebra">
            <thead>
              <tr>
                <th>Variable Name</th>
                <th>Type</th>
                <th>Occurrences</th>
                <th>Example Value</th>
                <th>All Values</th>
              </tr>
            </thead>
            <tbody>
              {extractedVariables.map((variable) => (
                <tr key={variable.variableName}>
                  <td className="font-mono font-medium">{variable.variableName}</td>
                  <td>
                    <div
                      className="tooltip tooltip-top cursor-help"
                      data-tip={getTypeTooltip(variable.type)}
                    >
                      <span className="badge badge-outline">{variable.type}</span>
                    </div>
                  </td>
                  <td>{variable.occurrences}</td>
                  <td className="font-mono text-xs max-w-xs truncate">{variable.exampleValue}</td>
                  <td>
                    <button
                      className="btn btn-sm btn-outline"
                      onClick={() => handleShowValues(variable)}
                    >
                      Show
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Structure Analysis Section */}
      {extractedVariables.length > 0 && (
        <div className="mt-6">
          <div className="divider">
            <span className="text-lg font-semibold">Structure Analysis</span>
          </div>

          {/* Analysis Tabs */}
          <div className="tabs tabs-boxed mb-4">
            <button
              className={`tab ${analysisTab === "statistics" ? "tab-active" : ""}`}
              onClick={() => setAnalysisTab("statistics")}
            >
              Statistics
            </button>
            <button
              className={`tab ${analysisTab === "patterns" ? "tab-active" : ""}`}
              onClick={() => setAnalysisTab("patterns")}
            >
              Patterns
            </button>
            <button
              className={`tab ${analysisTab === "validation" ? "tab-active" : ""}`}
              onClick={() => setAnalysisTab("validation")}
            >
              Validation
              {structureAnalysis.validation.errors.length > 0 && (
                <span className="badge badge-error badge-sm ml-2">
                  {structureAnalysis.validation.errors.length}
                </span>
              )}
              {structureAnalysis.validation.warnings.length > 0 &&
                structureAnalysis.validation.errors.length === 0 && (
                  <span className="badge badge-warning badge-sm ml-2">
                    {structureAnalysis.validation.warnings.length}
                  </span>
                )}
            </button>
            <button
              className={`tab ${analysisTab === "recommendations" ? "tab-active" : ""}`}
              onClick={() => setAnalysisTab("recommendations")}
            >
              Recommendations
              {structureAnalysis.recommendations.length > 0 && (
                <span className="badge badge-info badge-sm ml-2">
                  {structureAnalysis.recommendations.length}
                </span>
              )}
            </button>
          </div>

          {/* Statistics Tab */}
          {analysisTab === "statistics" && (
            <div className="space-y-4">
              <div className="stats stats-vertical lg:stats-horizontal shadow w-full">
                <div className="stat">
                  <div className="stat-title">Max Depth</div>
                  <div className="stat-value text-primary">
                    {structureAnalysis.statistics.maxDepth}
                  </div>
                  <div className="stat-desc">
                    Average: {structureAnalysis.statistics.averageDepth.toFixed(2)}
                  </div>
                </div>
                <div className="stat">
                  <div className="stat-title">Complexity</div>
                  <div className="stat-value text-secondary">
                    {structureAnalysis.statistics.complexity.totalVariables}
                  </div>
                  <div
                    className="stat-desc tooltip tooltip-top cursor-help"
                    data-tip="Average number of nested variables per group. Higher values indicate more grouping under fewer groups (more complex/nested structure). Lower values indicate a flatter, more spread-out structure."
                  >
                    {structureAnalysis.statistics.complexity.averageVariablesPerGroup.toFixed(1)}{" "}
                    variables/group
                  </div>
                </div>
                <div className="stat">
                  <div className="stat-title">Type Distribution</div>
                  <div className="stat-value">
                    <div className="flex gap-2 flex-wrap">
                      {Array.from(structureAnalysis.statistics.typeDistribution.entries()).map(
                        ([type, count]) => (
                          <span key={type} className="badge badge-lg">
                            {type}: {count}
                          </span>
                        )
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Depth Distribution */}
              {structureAnalysis.statistics.depthDistribution.size > 0 && (
                <div className="card bg-base-200 p-4">
                  <h3 className="font-semibold mb-2">Depth Distribution</h3>
                  <div className="space-y-2">
                    {Array.from(structureAnalysis.statistics.depthDistribution.entries())
                      .sort(([a], [b]) => a - b)
                      .map(([depth, count]) => (
                        <div key={depth} className="flex items-center gap-4">
                          <span className="w-16 font-mono">Depth {depth}:</span>
                          <div className="flex-1">
                            <div className="h-4 bg-base-300 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full transition-all"
                                style={{
                                  width: `${
                                    (count / structureAnalysis.statistics.totalVariables) * 100
                                  }%`,
                                }}
                              />
                            </div>
                          </div>
                          <span className="text-sm text-muted-content w-16 text-right">
                            {count} vars
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Patterns Tab */}
          {analysisTab === "patterns" && (
            <div className="space-y-4">
              {/* Common Patterns */}
              {structureAnalysis.patterns.length > 0 && (
                <div className="card bg-base-200 p-4">
                  <h3 className="font-semibold mb-3">Detected Patterns</h3>
                  <div className="space-y-3">
                    {structureAnalysis.patterns.map((pattern, idx) => (
                      <div key={idx} className="border border-base-300 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="badge badge-lg">{pattern.type.replace(/_/g, " ")}</span>
                          <span className="text-sm text-muted-content">
                            {(pattern.confidence * 100).toFixed(0)}% confidence
                          </span>
                        </div>
                        <p className="text-sm mb-2">{pattern.description}</p>
                        {pattern.examplePaths.length > 0 && (
                          <div className="text-xs">
                            <span className="font-medium">Examples: </span>
                            <span className="font-mono text-muted-content">
                              {pattern.examplePaths.slice(0, 3).join(", ")}
                              {pattern.examplePaths.length > 3 && "..."}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Array Patterns */}
              {structureAnalysis.arrayPatterns.hasArrayPatterns && (
                <div className="card bg-base-200 p-4">
                  <h3 className="font-semibold mb-3">Array Patterns</h3>
                  <div className="space-y-2">
                    {structureAnalysis.arrayPatterns.uniformArrays.length > 0 && (
                      <div>
                        <span className="badge badge-success badge-sm mr-2">
                          Uniform ({structureAnalysis.arrayPatterns.uniformArrays.length})
                        </span>
                        <span className="text-sm text-muted-content">
                          Arrays with consistent structure across all items
                        </span>
                      </div>
                    )}
                    {structureAnalysis.arrayPatterns.variedArrays.length > 0 && (
                      <div>
                        <span className="badge badge-warning badge-sm mr-2">
                          Varied ({structureAnalysis.arrayPatterns.variedArrays.length})
                        </span>
                        <span className="text-sm text-muted-content">
                          Arrays with varying structure across items
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Validation Tab */}
          {analysisTab === "validation" && (
            <div className="space-y-4">
              {structureAnalysis.validation.issues.length === 0 ? (
                <div className="alert alert-success">
                  <span>✓ No validation issues found. Structure is consistent.</span>
                </div>
              ) : (
                <>
                  {structureAnalysis.validation.errors.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="font-semibold text-error">
                        Errors ({structureAnalysis.validation.errors.length})
                      </h3>
                      {structureAnalysis.validation.errors.map((issue, idx) => (
                        <div key={idx} className="alert alert-error">
                          <div>
                            <div className="font-medium">{issue.path}</div>
                            <div className="text-sm">{issue.message}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {structureAnalysis.validation.warnings.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="font-semibold text-warning">
                        Warnings ({structureAnalysis.validation.warnings.length})
                      </h3>
                      {structureAnalysis.validation.warnings.map((issue, idx) => (
                        <div key={idx} className="alert alert-warning">
                          <div>
                            <div className="font-medium">{issue.path}</div>
                            <div className="text-sm">{issue.message}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* Consistency Issues */}
              {structureAnalysis.consistency.issues.length > 0 && (
                <div className="card bg-base-200 p-4">
                  <h3 className="font-semibold mb-3">Consistency Issues</h3>
                  <div className="space-y-2">
                    {structureAnalysis.consistency.issues.map((issue, idx) => (
                      <div key={idx} className="border border-base-300 rounded-lg p-2 text-sm">
                        <div className="font-medium font-mono">{issue.path}</div>
                        <div className="text-muted-content">{issue.description}</div>
                        <div className="text-xs text-muted-content mt-1">
                          Affected: {issue.affectedOccurrences} / {issue.totalOccurrences}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Recommendations Tab */}
          {analysisTab === "recommendations" && (
            <div className="space-y-4">
              {structureAnalysis.recommendations.length === 0 ? (
                <div className="alert alert-info">
                  <span>No specific recommendations at this time.</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {structureAnalysis.recommendations.map((rec, idx) => (
                    <div
                      key={idx}
                      className={`alert ${
                        rec.type === "warning"
                          ? "alert-warning"
                          : rec.type === "suggestion"
                          ? "alert-info"
                          : "alert-success"
                      }`}
                    >
                      <div className="flex-1">
                        <div className="font-medium mb-1">{rec.message}</div>
                        {rec.affectedPaths && rec.affectedPaths.length > 0 && (
                          <div className="text-sm mt-2">
                            <span className="font-medium">Affected paths: </span>
                            <span className="font-mono text-xs">
                              {rec.affectedPaths.slice(0, 5).join(", ")}
                              {rec.affectedPaths.length > 5 &&
                                ` ... (+${rec.affectedPaths.length - 5} more)`}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal for showing all values */}
      <Modal open={isModalOpen} size="max-w-4xl">
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">
              All Values: <span className="font-mono">{selectedVariable?.variableName}</span>
            </h2>
            <button
              className="btn btn-sm btn-circle btn-ghost"
              onClick={() => setIsModalOpen(false)}
            >
              ✕
            </button>
          </div>

          <div className="text-sm text-muted-content">
            <span className="font-medium">Type:</span> {selectedVariable?.type} |{" "}
            <span className="font-medium">Occurrences:</span> {selectedVariable?.occurrences}
          </div>

          <div className="max-h-[60vh] overflow-auto space-y-4">
            {selectedVariable?.allValues.map((value, index) => {
              const isObject = typeof value === "object" && value !== null && !Array.isArray(value)
              const isArray = Array.isArray(value)
              const isJSON = isObject || isArray

              if (isJSON) {
                const jsonString = JSON.stringify(value, null, 2)
                return (
                  <div key={index} className="border border-base-300 rounded-lg overflow-hidden">
                    <div className="bg-base-200 px-3 py-1 text-xs font-mono text-muted-content">
                      [{index}]:
                    </div>
                    <SyntaxHighlighter
                      language="json"
                      style={isDark ? vscDarkPlus : oneLight}
                      customStyle={{
                        margin: 0,
                        fontSize: "0.875rem",
                      }}
                      codeTagProps={{
                        style: {
                          fontFamily:
                            "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace",
                        },
                      }}
                    >
                      {jsonString}
                    </SyntaxHighlighter>
                  </div>
                )
              }

              // For primitive values, show with simple formatting
              const formatted = formatValueForDisplay(value)
              return (
                <div key={index} className="border border-base-300 rounded-lg p-3">
                  <span className="text-muted-content text-xs font-mono">[{index}]:</span>{" "}
                  <span className="font-mono text-sm">{formatted}</span>
                </div>
              )
            })}
          </div>

          <div className="flex justify-end">
            <button className="btn btn-primary" onClick={() => setIsModalOpen(false)}>
              Close
            </button>
          </div>
        </div>
      </Modal>
    </Card>
  )
}
