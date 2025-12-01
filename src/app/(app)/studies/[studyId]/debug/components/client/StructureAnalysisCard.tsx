"use client"

import type { EnrichedJatosStudyResult } from "@/src/types/jatos"
import type { OriginalStructureAnalysis } from "../../../variables/utils/structureAnalyzer/analyzeOriginalStructure"
import type { NestedPath } from "../../../variables/utils/nestedStructureExtractor"
import {
  getExtractedPathsForComponent,
  aggregatePathsByParentKey,
} from "../../../variables/utils/componentPathExtractor"
import Card from "@/src/app/components/Card"
import JsonSyntaxHighlighter from "@/src/app/components/JsonSyntaxHighlighter"
import { Alert } from "@/src/app/components/Alert"
import { useState, useMemo } from "react"

interface StructureAnalysisCardProps {
  enrichedResult: EnrichedJatosStudyResult
  originalStructureAnalysis: OriginalStructureAnalysis // Changed from ComponentStructureAnalysis
}

export default function StructureAnalysisCard({
  enrichedResult,
  originalStructureAnalysis,
}: StructureAnalysisCardProps) {
  const [analysisTab, setAnalysisTab] = useState<"overview" | "components">("overview")
  const [selectedComponentId, setSelectedComponentId] = useState<number | "all" | null>(
    enrichedResult.componentResults.find((c) => c.dataContent)?.componentId ?? "all"
  )
  const [copySuccess, setCopySuccess] = useState(false)
  const [highlightedPath, setHighlightedPath] = useState<{
    path: string
    componentId: number
  } | null>(null)

  // Collect all extracted paths from all components for the overview
  const allExtractedPathsByParentKey = useMemo(
    () => aggregatePathsByParentKey(enrichedResult, originalStructureAnalysis),
    [enrichedResult, originalStructureAnalysis]
  )

  // Helper function to render component data
  const renderComponentData = (component: (typeof enrichedResult.componentResults)[0]) => {
    const format = component.detectedFormat?.format
    const parsedData = component.parsedData

    // JSON: Pretty-print with syntax highlighting
    if (format === "json" && parsedData) {
      const jsonString = JSON.stringify(parsedData, null, 2)
      return (
        <div
          id={`raw-data-component-${component.componentId}`}
          className="max-h-96 overflow-auto rounded-lg border border-base-300 scroll-mt-4"
        >
          <JsonSyntaxHighlighter code={jsonString} language="json" />
        </div>
      )
    }

    // CSV/TSV: Display as a table
    if ((format === "csv" || format === "tsv") && parsedData && Array.isArray(parsedData)) {
      if (parsedData.length === 0) {
        return <Alert variant="info">No data rows found</Alert>
      }

      const headers = Object.keys(parsedData[0] || {})
      return (
        <div
          id={`raw-data-component-${component.componentId}`}
          className="overflow-x-auto max-h-96 border border-base-300 rounded-lg scroll-mt-4"
        >
          <table className="table table-zebra table-pin-rows">
            <thead>
              <tr>
                {headers.map((header) => (
                  <th key={header} className="font-mono text-xs bg-base-300 font-semibold">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {parsedData.map((row: Record<string, any>, idx: number) => (
                <tr key={idx}>
                  {headers.map((header) => {
                    const value = row[header]
                    const isNumber = typeof value === "number"
                    const isBoolean = typeof value === "boolean"
                    const isNull = value === null || value === undefined
                    const isObject = typeof value === "object" && !isNull

                    let displayValue = ""
                    if (isNull) {
                      displayValue = ""
                    } else if (isObject) {
                      displayValue = JSON.stringify(value)
                    } else {
                      displayValue = String(value)
                    }

                    const className = `font-mono text-xs ${
                      isNumber
                        ? "text-warning"
                        : isBoolean
                        ? "text-secondary"
                        : isNull
                        ? "text-base-content/40"
                        : ""
                    }`

                    return (
                      <td key={header} className={className}>
                        {displayValue}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }

    // Plain text or fallback: Show with syntax highlighting if possible
    return (
      <div
        id={`raw-data-component-${component.componentId}`}
        className="max-h-96 overflow-auto rounded-lg border border-base-300 scroll-mt-4"
      >
        <JsonSyntaxHighlighter code={component.dataContent || ""} language="text" />
      </div>
    )
  }

  // Get components with data
  const componentsWithData = enrichedResult.componentResults.filter((c) => c.dataContent)

  // Handle copy functionality
  const handleCopy = async () => {
    try {
      let textToCopy = ""

      if (selectedComponentId === "all") {
        // Copy all components as a JSON object
        const allComponentsData: Record<string, any> = {}
        componentsWithData.forEach((component) => {
          const key = `component_${component.componentId}`
          const format = component.detectedFormat?.format

          if (format === "json" && component.parsedData) {
            allComponentsData[key] = component.parsedData
          } else {
            // For CSV/TSV/text, include both raw and parsed if available
            allComponentsData[key] = {
              raw: component.dataContent,
              parsed: component.parsedData,
              format: format,
            }
          }
        })
        textToCopy = JSON.stringify(allComponentsData, null, 2)
      } else if (typeof selectedComponentId === "number") {
        const selectedComponent = enrichedResult.componentResults.find(
          (c) => c.componentId === selectedComponentId
        )

        if (selectedComponent?.dataContent) {
          const format = selectedComponent.detectedFormat?.format

          if (format === "json" && selectedComponent.parsedData) {
            // Copy pretty-printed JSON
            textToCopy = JSON.stringify(selectedComponent.parsedData, null, 2)
          } else {
            // Copy raw content for CSV/TSV/text
            textToCopy = selectedComponent.dataContent
          }
        }
      }

      if (textToCopy) {
        await navigator.clipboard.writeText(textToCopy)
        setCopySuccess(true)
        setTimeout(() => setCopySuccess(false), 2000)
      }
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  return (
    <Card
      title="Structure Analysis"
      collapsible
      defaultOpen={true}
      actions={
        analysisTab === "components" &&
        componentsWithData.length > 0 &&
        (selectedComponentId === "all" || selectedComponentId !== null) && (
          <button className="btn btn-sm btn-outline" onClick={handleCopy}>
            {copySuccess ? "Copied!" : "Copy JSON"}
          </button>
        )
      }
    >
      {/* Analysis Tabs */}
      <div className="tabs tabs-boxed mb-4">
        <button
          className={`tab ${analysisTab === "overview" ? "tab-active" : ""}`}
          onClick={() => setAnalysisTab("overview")}
        >
          Overview
        </button>
        <button
          className={`tab ${analysisTab === "components" ? "tab-active" : ""}`}
          onClick={() => setAnalysisTab("components")}
        >
          Components ({originalStructureAnalysis.components.length})
        </button>
      </div>

      {/* Overview Tab */}
      {analysisTab === "overview" && (
        <div className="space-y-4">
          <div className="stats stats-vertical lg:stats-horizontal shadow w-full">
            <div className="stat">
              <div className="stat-title">Data Structure</div>
              <div className="stat-value text-primary capitalize">
                {originalStructureAnalysis.structureType}
              </div>
            </div>
            <div className="stat">
              <div className="stat-title">Max Nesting Depth</div>
              <div className="stat-value text-secondary">
                {originalStructureAnalysis.statistics.maxNestingDepth}
              </div>
              <div className="stat-desc">
                Average: {originalStructureAnalysis.statistics.averageNestingDepth.toFixed(2)}
              </div>
            </div>
            <div className="stat">
              <div className="stat-title">Top-Level Variable Groups</div>
              <div className="stat-value">
                {originalStructureAnalysis.statistics.totalTopLevelGroups}
              </div>
              <div className="stat-desc">
                extracted from {originalStructureAnalysis.statistics.componentsWithData} components
                with data
              </div>
            </div>
          </div>

          {/* Structure Characteristics */}
          <div className="card bg-base-200 p-4">
            <h3 className="font-semibold mb-3">Structure Characteristics</h3>
            <div className="flex flex-wrap gap-2">
              {originalStructureAnalysis.characteristics.hasNestedObjects && (
                <span className="badge badge-lg badge-warning">Has Nested Objects</span>
              )}
              {originalStructureAnalysis.characteristics.hasArrays && (
                <span className="badge badge-lg">Contains Arrays</span>
              )}
            </div>
          </div>

          {/* Top-Level Groups */}
          {originalStructureAnalysis.statistics.totalTopLevelGroups > 0 && (
            <div className="card bg-base-200 p-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold">Top-Level Groups</h3>
                <div className="flex gap-3 text-xs text-muted-content">
                  <div className="flex items-center gap-1">
                    <span className="badge badge-primary badge-xs"></span>
                    <span>Primitive</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="badge badge-secondary badge-xs"></span>
                    <span>Array</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="badge badge-accent badge-xs"></span>
                    <span>Object</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {Array.from(originalStructureAnalysis.topLevelKeyTypes.keys()).map((key) => {
                  const keyType = originalStructureAnalysis.topLevelKeyTypes.get(key)
                  const badgeClass =
                    keyType === "primitive"
                      ? "badge-primary"
                      : keyType === "array"
                      ? "badge-secondary"
                      : "badge-accent"

                  // Find the first component that has this key
                  const componentWithKey = enrichedResult.componentResults.find((component) => {
                    const componentAnalysis = originalStructureAnalysis.components.find(
                      (c) => c.componentId === component.componentId
                    )
                    return componentAnalysis?.topLevelKeys.includes(key)
                  })

                  return (
                    <button
                      key={key}
                      className={`badge ${badgeClass} badge-lg font-mono cursor-pointer hover:opacity-80 transition-opacity ${
                        highlightedPath?.path === key &&
                        componentWithKey &&
                        highlightedPath?.componentId === componentWithKey.componentId
                          ? "ring-2 ring-info ring-offset-2"
                          : ""
                      }`}
                      title={`Type: ${keyType} - Click to highlight in raw data`}
                      onClick={() => {
                        if (componentWithKey) {
                          // Switch to Components tab
                          setAnalysisTab("components")
                          // Select the component that has this key
                          setSelectedComponentId(componentWithKey.componentId)
                          // Set highlighted path
                          setHighlightedPath({
                            path: key,
                            componentId: componentWithKey.componentId,
                          })
                          // Scroll to raw data viewer after a short delay
                          setTimeout(() => {
                            const element = document.getElementById(
                              `raw-data-component-${componentWithKey.componentId}`
                            )
                            element?.scrollIntoView({
                              behavior: "smooth",
                              block: "center",
                            })
                          }, 200)
                        }
                      }}
                    >
                      {key}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Extracted Variables from Objects (Overview) */}
          {allExtractedPathsByParentKey.size > 0 && (
            <div className="space-y-4 mt-6">
              {Array.from(allExtractedPathsByParentKey.entries()).map(
                ([parentKey, pathsWithComponents]) => (
                  <div key={parentKey} className="card bg-base-200 p-4">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-semibold text-sm">
                        Extracted Variables from <span className="font-mono">{parentKey}</span>
                      </h4>
                      <div className="text-xs text-muted-content">
                        {pathsWithComponents.length} variable
                        {pathsWithComponents.length !== 1 ? "s" : ""}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {pathsWithComponents.map(({ path, componentId }) => {
                        // Map nested path type to badge class (same as top-level keys)
                        const badgeClass =
                          path.type === "string" ||
                          path.type === "number" ||
                          path.type === "boolean" ||
                          path.type === "null"
                            ? "badge-primary"
                            : path.type === "array"
                            ? "badge-secondary"
                            : "badge-accent"
                        // Normalize type for tooltip (match top-level keys format)
                        const tooltipType =
                          path.type === "string" ||
                          path.type === "number" ||
                          path.type === "boolean" ||
                          path.type === "null"
                            ? "primitive"
                            : path.type
                        return (
                          <button
                            key={`${path.path}-${componentId}`}
                            className={`badge ${badgeClass} badge-sm font-mono cursor-pointer hover:opacity-80 transition-opacity ${
                              highlightedPath?.path === path.path &&
                              highlightedPath?.componentId === componentId
                                ? "ring-2 ring-info ring-offset-2"
                                : ""
                            }`}
                            title={`Type: ${tooltipType} - Click to highlight in raw data`}
                            onClick={() => {
                              // Switch to Components tab
                              setAnalysisTab("components")
                              // Select the component that has this path
                              setSelectedComponentId(componentId)
                              // Set highlighted path
                              setHighlightedPath({
                                path: path.path,
                                componentId: componentId,
                              })
                              // Scroll to raw data viewer after a short delay
                              setTimeout(() => {
                                const element = document.getElementById(
                                  `raw-data-component-${componentId}`
                                )
                                element?.scrollIntoView({
                                  behavior: "smooth",
                                  block: "center",
                                })
                              }, 200)
                            }}
                          >
                            {path.path}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      )}

      {/* Components Tab */}
      {analysisTab === "components" && (
        <div className="space-y-4">
          {/* Component Selector */}
          {componentsWithData.length > 0 && (
            <div className="mb-4">
              <label className="label mb-2">
                <span className="label-text font-semibold">Select Component</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={selectedComponentId ?? ""}
                onChange={(e) => {
                  const value = e.target.value
                  if (value === "all") {
                    setSelectedComponentId("all")
                  } else if (value === "") {
                    setSelectedComponentId(null)
                  } else {
                    setSelectedComponentId(Number(value))
                  }
                }}
              >
                <option value="">Select a component...</option>
                <option value="all">All Components</option>
                {componentsWithData.map((component) => (
                  <option key={component.id} value={component.componentId}>
                    Component {component.componentId}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Display selected component(s) */}
          {selectedComponentId === "all" ? (
            // All Components View
            <div className="space-y-6">
              {componentsWithData.map((component) => {
                const componentAnalysis = originalStructureAnalysis.components.find(
                  (c) => c.componentId === component.componentId
                )

                return (
                  <div key={component.id} className="card bg-base-200 p-4">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-semibold">Component {component.componentId}</h3>
                      <div className="flex gap-2 items-center">
                        {componentAnalysis && (
                          <span className="badge badge-lg capitalize">
                            {componentAnalysis.structureType}
                          </span>
                        )}
                        {component.parseError && (
                          <div className="badge badge-warning badge-sm">Parse Error</div>
                        )}
                      </div>
                    </div>

                    {componentAnalysis && (
                      <div className="grid grid-cols-3 gap-4 mb-3">
                        <div>
                          <div className="text-xs text-muted-content">Max Depth</div>
                          <div className="font-medium">{componentAnalysis.maxDepth}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-content">Top-Level Keys</div>
                          <div className="font-medium">{componentAnalysis.topLevelKeys.length}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-content">Total Keys</div>
                          <div className="font-medium">{componentAnalysis.totalKeys}</div>
                        </div>
                      </div>
                    )}

                    {componentAnalysis && componentAnalysis.topLevelKeys.length > 0 && (
                      <div className="mb-3">
                        <div className="text-xs text-muted-content mb-1">Top-Level Keys:</div>
                        <div className="flex flex-wrap gap-1">
                          {componentAnalysis.topLevelKeys.map((key: string) => {
                            const keyType = componentAnalysis.topLevelKeyTypes.get(key)
                            const badgeClass =
                              keyType === "primitive"
                                ? "badge-primary"
                                : keyType === "array"
                                ? "badge-secondary"
                                : "badge-accent"
                            return (
                              <button
                                key={key}
                                className={`badge ${badgeClass} badge-sm font-mono cursor-pointer hover:opacity-80 transition-opacity ${
                                  highlightedPath?.path === key &&
                                  highlightedPath?.componentId === component.componentId
                                    ? "ring-2 ring-info ring-offset-2"
                                    : ""
                                }`}
                                title={`Type: ${keyType} - Click to highlight in raw data`}
                                onClick={() => {
                                  setHighlightedPath({
                                    path: key,
                                    componentId: component.componentId,
                                  })
                                  // Scroll to raw data viewer after a short delay
                                  setTimeout(() => {
                                    const element = document.getElementById(
                                      `raw-data-component-${component.componentId}`
                                    )
                                    element?.scrollIntoView({
                                      behavior: "smooth",
                                      block: "center",
                                    })
                                  }, 100)
                                }}
                              >
                                {key}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Extracted Variables from Objects */}
                    {(() => {
                      const componentData = component.parsedData
                      const extractedPathsByKey = getExtractedPathsForComponent(
                        componentData,
                        componentAnalysis
                      )

                      if (extractedPathsByKey.size === 0) return null

                      // Collect all unique paths with their types from all object keys
                      const pathsMap = new Map<string, NestedPath>()
                      Array.from(extractedPathsByKey.values())
                        .flat()
                        .forEach((path) => {
                          if (!pathsMap.has(path.path)) {
                            pathsMap.set(path.path, path)
                          }
                        })
                      const allExtractedPaths = Array.from(pathsMap.values())

                      if (allExtractedPaths.length === 0) return null

                      return (
                        <div className="mb-3 mt-4">
                          <div className="text-xs text-muted-content mb-1">
                            Extracted Variables from Objects:
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {allExtractedPaths.map((path) => {
                              // Map nested path type to badge class (same as top-level keys)
                              const badgeClass =
                                path.type === "string" ||
                                path.type === "number" ||
                                path.type === "boolean" ||
                                path.type === "null"
                                  ? "badge-primary"
                                  : path.type === "array"
                                  ? "badge-secondary"
                                  : "badge-accent"
                              // Normalize type for tooltip (match top-level keys format)
                              const tooltipType =
                                path.type === "string" ||
                                path.type === "number" ||
                                path.type === "boolean" ||
                                path.type === "null"
                                  ? "primitive"
                                  : path.type
                              return (
                                <button
                                  key={path.path}
                                  className={`badge ${badgeClass} badge-sm font-mono cursor-pointer hover:opacity-80 transition-opacity ${
                                    highlightedPath?.path === path.path &&
                                    highlightedPath?.componentId === component.componentId
                                      ? "ring-2 ring-info ring-offset-2"
                                      : ""
                                  }`}
                                  title={`Type: ${tooltipType} - Click to highlight in raw data`}
                                  onClick={() => {
                                    setHighlightedPath({
                                      path: path.path,
                                      componentId: component.componentId,
                                    })
                                    // Scroll to raw data viewer after a short delay
                                    setTimeout(() => {
                                      const element = document.getElementById(
                                        `raw-data-component-${component.componentId}`
                                      )
                                      element?.scrollIntoView({
                                        behavior: "smooth",
                                        block: "center",
                                      })
                                    }, 100)
                                  }}
                                >
                                  {path.path}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })()}

                    {component.parseError && (
                      <Alert variant="warning" className="mb-3" title="Parse Error">
                        {component.parseError}
                      </Alert>
                    )}

                    {renderComponentData(component)}
                  </div>
                )
              })}
            </div>
          ) : typeof selectedComponentId === "number" ? (
            // Single Component View
            (() => {
              const selectedComponent = enrichedResult.componentResults.find(
                (c) => c.componentId === selectedComponentId
              )
              const componentAnalysis = originalStructureAnalysis.components.find(
                (c) => c.componentId === selectedComponentId
              )

              if (!selectedComponent || !selectedComponent.dataContent) {
                return (
                  <Alert variant="info">Please select a component with data to view details</Alert>
                )
              }

              return (
                <div className="card bg-base-200 p-4">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-semibold">Component {selectedComponent.componentId}</h3>
                    <div className="flex gap-2 items-center">
                      {componentAnalysis && (
                        <span className="badge badge-lg capitalize">
                          {componentAnalysis.structureType}
                        </span>
                      )}
                      {selectedComponent.parseError && (
                        <div className="badge badge-warning badge-sm">Parse Error</div>
                      )}
                    </div>
                  </div>

                  {componentAnalysis && (
                    <div className="grid grid-cols-3 gap-4 mb-3">
                      <div>
                        <div className="text-xs text-muted-content">Max Depth</div>
                        <div className="font-medium">{componentAnalysis.maxDepth}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-content">Top-Level Keys</div>
                        <div className="font-medium">{componentAnalysis.topLevelKeys.length}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-content">Total Keys</div>
                        <div className="font-medium">{componentAnalysis.totalKeys}</div>
                      </div>
                    </div>
                  )}

                  {componentAnalysis && componentAnalysis.topLevelKeys.length > 0 && (
                    <div className="mb-3">
                      <div className="text-xs text-muted-content mb-1">Top-Level Keys:</div>
                      <div className="flex flex-wrap gap-1">
                        {componentAnalysis.topLevelKeys.map((key: string) => {
                          const keyType = componentAnalysis.topLevelKeyTypes.get(key)
                          const badgeClass =
                            keyType === "primitive"
                              ? "badge-primary"
                              : keyType === "array"
                              ? "badge-secondary"
                              : "badge-accent"
                          return (
                            <button
                              key={key}
                              className={`badge ${badgeClass} badge-sm font-mono cursor-pointer hover:opacity-80 transition-opacity ${
                                highlightedPath?.path === key &&
                                highlightedPath?.componentId === selectedComponent.componentId
                                  ? "ring-2 ring-info ring-offset-2"
                                  : ""
                              }`}
                              title={`Type: ${keyType} - Click to highlight in raw data`}
                              onClick={() => {
                                setHighlightedPath({
                                  path: key,
                                  componentId: selectedComponent.componentId,
                                })
                                // Scroll to raw data viewer after a short delay
                                setTimeout(() => {
                                  const element = document.getElementById(
                                    `raw-data-component-${selectedComponent.componentId}`
                                  )
                                  element?.scrollIntoView({
                                    behavior: "smooth",
                                    block: "center",
                                  })
                                }, 100)
                              }}
                            >
                              {key}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Extracted Variables from Objects */}
                  {(() => {
                    const componentData = selectedComponent.parsedData
                    const extractedPathsByKey = getExtractedPathsForComponent(
                      componentData,
                      componentAnalysis
                    )

                    if (extractedPathsByKey.size === 0) return null

                    // Collect all unique paths with their types from all object keys
                    const pathsMap = new Map<string, NestedPath>()
                    Array.from(extractedPathsByKey.values())
                      .flat()
                      .forEach((path) => {
                        if (!pathsMap.has(path.path)) {
                          pathsMap.set(path.path, path)
                        }
                      })
                    const allExtractedPaths = Array.from(pathsMap.values())

                    if (allExtractedPaths.length === 0) return null

                    return (
                      <div className="mb-3 mt-4">
                        <div className="text-xs text-muted-content mb-1">
                          Extracted Variables from Objects:
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {allExtractedPaths.map((path) => {
                            // Map nested path type to badge class (same as top-level keys)
                            const badgeClass =
                              path.type === "string" ||
                              path.type === "number" ||
                              path.type === "boolean" ||
                              path.type === "null"
                                ? "badge-primary"
                                : path.type === "array"
                                ? "badge-secondary"
                                : "badge-accent"
                            // Normalize type for tooltip (match top-level keys format)
                            const tooltipType =
                              path.type === "string" ||
                              path.type === "number" ||
                              path.type === "boolean" ||
                              path.type === "null"
                                ? "primitive"
                                : path.type
                            return (
                              <button
                                key={path.path}
                                className={`badge ${badgeClass} badge-sm font-mono cursor-pointer hover:opacity-80 transition-opacity ${
                                  highlightedPath?.path === path.path &&
                                  highlightedPath?.componentId === selectedComponent.componentId
                                    ? "ring-2 ring-info ring-offset-2"
                                    : ""
                                }`}
                                title={`Type: ${tooltipType} - Click to highlight in raw data`}
                                onClick={() => {
                                  setHighlightedPath({
                                    path: path.path,
                                    componentId: selectedComponent.componentId,
                                  })
                                  // Scroll to raw data viewer after a short delay
                                  setTimeout(() => {
                                    const element = document.getElementById(
                                      `raw-data-component-${selectedComponent.componentId}`
                                    )
                                    element?.scrollIntoView({
                                      behavior: "smooth",
                                      block: "center",
                                    })
                                  }, 100)
                                }}
                              >
                                {path.path}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })()}

                  {selectedComponent.parseError && (
                    <Alert variant="warning" className="mb-3" title="Parse Error">
                      {selectedComponent.parseError}
                    </Alert>
                  )}

                  {renderComponentData(selectedComponent)}
                </div>
              )
            })()
          ) : (
            <Alert variant="info">Please select a component to view details</Alert>
          )}
        </div>
      )}
    </Card>
  )
}
