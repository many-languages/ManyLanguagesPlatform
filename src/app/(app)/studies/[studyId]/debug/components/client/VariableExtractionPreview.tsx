"use client"

import type { EnrichedJatosStudyResult } from "@/src/types/jatos"
import { extractVariables } from "../../../variables/utils/extractVariable"
import {
  analyzeOriginalStructure,
  type ComponentStructureAnalysis,
} from "../../../variables/utils/structureAnalyzer/analyzeOriginalStructure"
import {
  extractNestedPaths,
  type NestedPath,
} from "../../../variables/utils/nestedStructureExtractor"
import Card from "@/src/app/components/Card"
import Modal from "@/src/app/components/Modal"
import { useState, useEffect, useMemo, useRef } from "react"
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
  const originalStructureAnalysis = useMemo(
    () => analyzeOriginalStructure(enrichedResult),
    [enrichedResult]
  )
  const [selectedVariable, setSelectedVariable] = useState<ExtractedVariable | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDark, setIsDark] = useState(false)
  const [analysisTab, setAnalysisTab] = useState<"overview" | "components">("overview")
  const [selectedComponentId, setSelectedComponentId] = useState<number | "all" | null>(
    enrichedResult.componentResults.find((c) => c.dataContent)?.componentId ?? "all"
  )
  const [copySuccess, setCopySuccess] = useState(false)
  const [highlightedPath, setHighlightedPath] = useState<{
    path: string
    componentId: number
  } | null>(null)

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

  // Helper to get extracted paths for object-type keys in a component
  const getExtractedPathsForComponent = (
    parsedData: any,
    componentAnalysis: ComponentStructureAnalysis | undefined
  ): Map<string, NestedPath[]> => {
    const extractedPathsByKey = new Map<string, NestedPath[]>()

    if (!parsedData || !componentAnalysis) return extractedPathsByKey

    // Find all object-type top-level keys
    const objectKeys = componentAnalysis.topLevelKeys.filter(
      (key) => componentAnalysis.topLevelKeyTypes.get(key) === "object"
    )

    if (objectKeys.length === 0) return extractedPathsByKey

    // Extract nested paths from each object key
    objectKeys.forEach((objectKey) => {
      let objectValue: any = null

      if (
        componentAnalysis.structureType === "array" &&
        Array.isArray(parsedData) &&
        parsedData.length > 0
      ) {
        // For array structures, get the value from first item
        const firstItem = parsedData[0]
        objectValue = firstItem?.[objectKey]
      } else if (
        componentAnalysis.structureType === "object" &&
        typeof parsedData === "object" &&
        parsedData !== null
      ) {
        objectValue = parsedData[objectKey]
      }

      // Only extract if it's actually an object (not array, not null)
      if (objectValue && typeof objectValue === "object" && !Array.isArray(objectValue)) {
        const nestedPaths = extractNestedPaths(objectValue, objectKey)
        // Filter to include all paths that start with this object key (excluding the key itself)
        const allNestedPaths = nestedPaths.filter(
          (path) => path.path !== objectKey && path.path.startsWith(`${objectKey}.`)
        )

        // Deduplicate paths by path string to avoid duplicate keys in React
        const uniquePathsMap = new Map<string, NestedPath>()
        allNestedPaths.forEach((path) => {
          if (!uniquePathsMap.has(path.path)) {
            uniquePathsMap.set(path.path, path)
          }
        })

        const uniquePaths = Array.from(uniquePathsMap.values())

        if (uniquePaths.length > 0) {
          extractedPathsByKey.set(objectKey, uniquePaths)
        }
      }
    })

    return extractedPathsByKey
  }

  // Collect all extracted paths from all components for the overview
  const allExtractedPathsByParentKey = useMemo(() => {
    const pathsByParentKey = new Map<string, Array<{ path: NestedPath; componentId: number }>>()

    enrichedResult.componentResults.forEach((component) => {
      const componentAnalysis = originalStructureAnalysis.components.find(
        (c) => c.componentId === component.componentId
      )
      const extractedPathsByKey = getExtractedPathsForComponent(
        component.parsedData,
        componentAnalysis
      )

      // Group paths by their parent key (first part of the path)
      extractedPathsByKey.forEach((paths, parentKey) => {
        paths.forEach((path) => {
          if (!pathsByParentKey.has(parentKey)) {
            pathsByParentKey.set(parentKey, [])
          }
          pathsByParentKey.get(parentKey)!.push({
            path,
            componentId: component.componentId,
          })
        })
      })
    })

    // Deduplicate paths by path string across all components
    const deduplicated = new Map<string, Array<{ path: NestedPath; componentId: number }>>()
    pathsByParentKey.forEach((pathsWithComponents, parentKey) => {
      const uniquePaths = new Map<string, { path: NestedPath; componentId: number }>()
      pathsWithComponents.forEach(({ path, componentId }) => {
        if (!uniquePaths.has(path.path)) {
          uniquePaths.set(path.path, { path, componentId })
        }
      })
      if (uniquePaths.size > 0) {
        deduplicated.set(parentKey, Array.from(uniquePaths.values()))
      }
    })

    return deduplicated
  }, [enrichedResult, originalStructureAnalysis])

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

  // JSON Viewer Component with highlighting support
  const JsonViewerWithHighlight = ({
    jsonString,
    componentId,
    pathToHighlight,
  }: {
    jsonString: string
    componentId: number
    pathToHighlight: string | null
  }) => {
    const codeRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
      if (!pathToHighlight || !codeRef.current) {
        // Remove any existing highlights
        const highlights = codeRef.current?.querySelectorAll(".json-path-highlight")
        highlights?.forEach((el) => {
          const parent = el.parentElement
          if (parent) {
            const textNode = document.createTextNode(el.textContent || "")
            parent.replaceChild(textNode, el)
            parent.normalize()
          }
        })
        return
      }

      // Wait for SyntaxHighlighter to render
      const timeoutId = setTimeout(() => {
        if (!codeRef.current) return

        const codeElement =
          codeRef.current.querySelector("pre code") || codeRef.current.querySelector("pre")
        if (!codeElement) return

        // Remove any existing highlights first
        const existingHighlights = codeElement.querySelectorAll(".json-path-highlight")
        existingHighlights.forEach((highlight) => {
          const parent = highlight.parentElement
          if (parent) {
            parent.replaceChild(document.createTextNode(highlight.textContent || ""), highlight)
            parent.normalize()
          }
        })

        // Extract the path parts
        const pathParts = pathToHighlight.split(".")
        const finalKey = pathParts[pathParts.length - 1]
        const escapedKey = finalKey.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
        const highlightColor = isDark ? "rgba(250, 204, 21, 0.7)" : "rgba(250, 204, 21, 0.8)"

        // Get the HTML
        let html = codeElement.innerHTML
        const keyToFind = `"${finalKey}"`

        // Check if key exists
        if (!html.includes(keyToFind)) return

        let targetMatchIndex: number | null = null

        if (pathParts.length === 1) {
          // Top-level key - just find the first occurrence
          targetMatchIndex = html.indexOf(keyToFind)
        } else {
          // Nested path - find by navigating through parent objects
          // Work backwards from the immediate parent to the top
          let searchStart = 0
          let searchEnd = html.length

          // Navigate through each parent level
          for (let i = pathParts.length - 2; i >= 0; i--) {
            const parentKey = pathParts[i]
            const escapedParentKey = parentKey.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
            const parentKeyPattern = `"${escapedParentKey}"`

            // Find the parent key within the current search range
            let parentKeyIndex = html.indexOf(parentKeyPattern, searchStart)
            if (parentKeyIndex === -1 || parentKeyIndex >= searchEnd) break

            // Find the opening brace of the parent object (after ": {")
            const afterParentKey = html.substring(parentKeyIndex)
            const colonMatch = afterParentKey.match(/:\s*\{/)
            if (!colonMatch) break

            const objectStart = parentKeyIndex + colonMatch.index! + colonMatch[0].length

            // Find the matching closing brace for this object
            let braceCount = 1
            let objectEnd = objectStart
            for (let j = objectStart; j < html.length && braceCount > 0; j++) {
              if (html[j] === "{") braceCount++
              if (html[j] === "}") braceCount--
              if (braceCount === 0) {
                objectEnd = j
                break
              }
            }

            // Update search range to be within this parent object
            searchStart = objectStart
            searchEnd = objectEnd

            // If this is the immediate parent, search for the target key within this object
            if (i === pathParts.length - 2) {
              const objectContent = html.substring(objectStart, objectEnd)
              const targetKeyIndex = objectContent.indexOf(keyToFind)
              if (targetKeyIndex !== -1) {
                targetMatchIndex = objectStart + targetKeyIndex
                break
              }
            }
          }
        }

        // Fallback: if still not found, use the first occurrence
        if (targetMatchIndex === null || targetMatchIndex === -1) {
          targetMatchIndex = html.indexOf(keyToFind)
        }

        // Highlight the target occurrence
        if (targetMatchIndex !== null && targetMatchIndex !== -1) {
          const before = html.substring(0, targetMatchIndex)
          const match = keyToFind
          const after = html.substring(targetMatchIndex + match.length)

          const highlightedHtml =
            before +
            `<span class="json-path-highlight" style="background-color: ${highlightColor}; padding: 2px 4px; border-radius: 3px; display: inline-block;">${match}</span>` +
            after

          if (highlightedHtml !== html) {
            codeElement.innerHTML = highlightedHtml
          }
        }
      }, 500)

      return () => clearTimeout(timeoutId)
    }, [pathToHighlight, isDark, jsonString])

    return (
      <div
        id={`raw-data-component-${componentId}`}
        className="max-h-96 overflow-auto rounded-lg border border-base-300 scroll-mt-4"
        ref={codeRef}
      >
        <SyntaxHighlighter
          language="json"
          style={isDark ? vscDarkPlus : oneLight}
          customStyle={{
            margin: 0,
            borderRadius: "0.5rem",
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

  // Helper function to render component data (from RawDataViewer)
  const renderComponentData = (component: (typeof enrichedResult.componentResults)[0]) => {
    const format = component.detectedFormat?.format
    const parsedData = component.parsedData
    const isHighlighted =
      highlightedPath?.componentId === component.componentId && highlightedPath?.path

    // JSON: Pretty-print with syntax highlighting
    if (format === "json" && parsedData) {
      const jsonString = JSON.stringify(parsedData, null, 2)
      return (
        <JsonViewerWithHighlight
          jsonString={jsonString}
          componentId={component.componentId}
          pathToHighlight={isHighlighted ? highlightedPath.path : null}
        />
      )
    }

    // CSV/TSV: Display as a table
    if ((format === "csv" || format === "tsv") && parsedData && Array.isArray(parsedData)) {
      if (parsedData.length === 0) {
        return (
          <div className="alert alert-info">
            <span>No data rows found</span>
          </div>
        )
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
        <SyntaxHighlighter
          language="text"
          style={isDark ? vscDarkPlus : oneLight}
          customStyle={{
            margin: 0,
            borderRadius: "0.5rem",
            fontSize: "0.875rem",
          }}
          codeTagProps={{
            style: {
              fontFamily:
                "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace",
              whiteSpace: "pre-wrap",
            },
          }}
        >
          {component.dataContent || ""}
        </SyntaxHighlighter>
      </div>
    )
  }

  // Get components with data
  const componentsWithData = enrichedResult.componentResults.filter((c) => c.dataContent)

  // Helper function to get values by path from parsedData
  const getValuesByPath = (
    parsedData: any,
    path: string,
    structureType: "array" | "object" | "primitive" | "null" | "empty"
  ): any[] => {
    if (!parsedData || !path) return []

    const values: any[] = []

    // Helper to get value from object by path segments
    const getValueFromObject = (obj: any, segments: string[]): any => {
      let current: any = obj
      for (const segment of segments) {
        if (current === null || current === undefined) return undefined
        current = current[segment]
      }
      return current
    }

    // Parse the path - handle dots and array notation
    // Path examples: "response.rating", "trials[*].rt", "metadata.created_at"
    const pathParts = path.split(".")
    const hasArrayWildcard = path.includes("[*]")

    if (structureType === "array" && Array.isArray(parsedData)) {
      // For array structures, iterate through items
      if (hasArrayWildcard) {
        // Handle wildcard paths like "trials[*].rt"
        const [basePath, ...restPath] = path.split("[*]")
        const remainingPath = restPath.join("[*]").replace(/^\./, "") // Remove leading dot

        parsedData.forEach((item) => {
          if (typeof item === "object" && item !== null) {
            // Get value from base path (e.g., "trials")
            let baseValue = basePath
              ? getValueFromObject(item, basePath.split(".").filter(Boolean))
              : item

            // Handle array wildcard - if baseValue is an array, iterate through it
            if (Array.isArray(baseValue)) {
              baseValue.forEach((subItem) => {
                if (remainingPath) {
                  const value = getValueFromObject(
                    subItem,
                    remainingPath.split(".").filter(Boolean)
                  )
                  if (value !== undefined) values.push(value)
                } else {
                  values.push(subItem)
                }
              })
            } else if (baseValue && typeof baseValue === "object") {
              // Base path points to an object, continue with remaining path
              if (remainingPath) {
                const value = getValueFromObject(
                  baseValue,
                  remainingPath.split(".").filter(Boolean)
                )
                if (value !== undefined) values.push(value)
              } else {
                values.push(baseValue)
              }
            }
          }
        })
      } else {
        // Handle regular paths like "response.rating" in array structure
        parsedData.forEach((item) => {
          if (typeof item === "object" && item !== null) {
            const value = getValueFromObject(item, pathParts)
            if (value !== undefined) values.push(value)
          }
        })
      }
    } else if (
      structureType === "object" &&
      typeof parsedData === "object" &&
      parsedData !== null &&
      !Array.isArray(parsedData)
    ) {
      // For object structures, access directly
      if (hasArrayWildcard) {
        // Handle wildcard paths in object structure
        const [basePath, ...restPath] = path.split("[*]")
        const remainingPath = restPath.join("[*]").replace(/^\./, "")

        let baseValue = basePath
          ? getValueFromObject(parsedData, basePath.split(".").filter(Boolean))
          : parsedData

        if (Array.isArray(baseValue)) {
          baseValue.forEach((subItem) => {
            if (remainingPath) {
              const value = getValueFromObject(subItem, remainingPath.split(".").filter(Boolean))
              if (value !== undefined) values.push(value)
            } else {
              values.push(subItem)
            }
          })
        } else {
          // No array found at wildcard location
          if (basePath && baseValue !== undefined) {
            values.push(baseValue)
          }
        }
      } else {
        // Regular path access
        const value = getValueFromObject(parsedData, pathParts)
        if (value !== undefined) values.push(value)
      }
    }

    return values.filter((v) => v !== undefined)
  }

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
    <div className="space-y-6">
      {/* Structure Analysis Card */}
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
                  extracted from {originalStructureAnalysis.statistics.componentsWithData}{" "}
                  components with data
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
                            <div className="font-medium">
                              {componentAnalysis.topLevelKeys.length}
                            </div>
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
                        <div className="alert alert-warning mb-3">
                          <span>
                            <strong>Parse Error:</strong> {component.parseError}
                          </span>
                        </div>
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
                    <div className="alert alert-info">
                      <span>Please select a component with data to view details</span>
                    </div>
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
                      <div className="alert alert-warning mb-3">
                        <span>
                          <strong>Parse Error:</strong> {selectedComponent.parseError}
                        </span>
                      </div>
                    )}

                    {renderComponentData(selectedComponent)}
                  </div>
                )
              })()
            ) : (
              <div className="alert alert-info">
                <span>Please select a component to view details</span>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Variable Extraction Preview Card */}
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
                {extractedVariables.map((variable) => {
                  // Determine badge class based on variable type (same as top-level keys)
                  const badgeClass =
                    variable.type === "primitive"
                      ? "badge-primary"
                      : variable.type === "array"
                      ? "badge-secondary"
                      : "badge-accent"

                  return (
                    <tr key={variable.variableName}>
                      <td className="font-mono font-medium">{variable.variableName}</td>
                      <td>
                        <div
                          className="tooltip tooltip-top cursor-help"
                          data-tip={getTypeTooltip(variable.type)}
                        >
                          <span className={`badge ${badgeClass}`}>{variable.type}</span>
                        </div>
                      </td>
                      <td>{variable.occurrences}</td>
                      <td className="font-mono text-xs max-w-xs truncate">
                        {variable.exampleValue}
                      </td>
                      <td>
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={() => handleShowValues(variable)}
                        >
                          Show
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

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
    </div>
  )
}
