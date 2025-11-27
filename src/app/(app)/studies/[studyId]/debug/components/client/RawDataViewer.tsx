"use client"

import type { EnrichedJatosStudyResult } from "@/src/types/jatos"
import { useState, useEffect } from "react"
import Card from "@/src/app/components/Card"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneLight, vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism"

interface RawDataViewerProps {
  enrichedResult: EnrichedJatosStudyResult
}

export default function RawDataViewer({ enrichedResult }: RawDataViewerProps) {
  const [selectedComponentId, setSelectedComponentId] = useState<number | "all" | null>(
    enrichedResult.componentResults.find((c) => c.dataContent)?.id ?? null
  )
  const [isDark, setIsDark] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)

  const selectedComponent =
    typeof selectedComponentId === "number"
      ? enrichedResult.componentResults.find((c) => c.id === selectedComponentId)
      : null

  const componentsWithData = enrichedResult.componentResults.filter((c) => c.dataContent)

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
      } else if (selectedComponent && selectedComponent.dataContent) {
        const format = selectedComponent.detectedFormat?.format

        if (format === "json" && selectedComponent.parsedData) {
          // Copy pretty-printed JSON
          textToCopy = JSON.stringify(selectedComponent.parsedData, null, 2)
        } else {
          // Copy raw content for CSV/TSV/text
          textToCopy = selectedComponent.dataContent
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

  // Helper function to render a component's data
  const renderComponentData = (component: (typeof componentsWithData)[0]) => {
    const format = component.detectedFormat?.format
    const parsedData = component.parsedData

    // JSON: Pretty-print with syntax highlighting
    if (format === "json" && parsedData) {
      const jsonString = JSON.stringify(parsedData, null, 2)
      return (
        <div className="max-h-96 overflow-auto rounded-lg border border-base-300">
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
        <div className="overflow-x-auto max-h-96 border border-base-300 rounded-lg">
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
      <div className="max-h-96 overflow-auto rounded-lg border border-base-300">
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

  if (componentsWithData.length === 0) {
    return (
      <Card title="Raw Data Viewer" collapsible defaultOpen={true}>
        <div className="alert alert-info">
          <span>No components with data content found</span>
        </div>
      </Card>
    )
  }

  return (
    <Card
      title="Raw Data Viewer"
      collapsible
      defaultOpen={true}
      actions={
        (selectedComponentId === "all" || selectedComponent) && (
          <button className="btn btn-sm btn-outline" onClick={handleCopy}>
            {copySuccess ? "Copied!" : "Copy JSON"}
          </button>
        )
      }
    >
      {/* Component Selector */}
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
            <option key={component.id} value={component.id}>
              Component {component.componentId}
            </option>
          ))}
        </select>
      </div>

      {/* Raw Data Display */}
      {selectedComponentId === "all" ? (
        // All Components View
        <div className="space-y-6">
          {componentsWithData.map((component) => (
            <div key={component.id} className="border border-base-300 rounded-lg p-4 bg-base-100">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold">Component {component.componentId}</h3>
                <div className="flex gap-2 items-center">
                  {component.parseError && (
                    <div className="badge badge-warning badge-sm">Parse Error</div>
                  )}
                  <span className="badge badge-sm">
                    {component.detectedFormat?.format.toUpperCase() ?? "UNKNOWN"}
                  </span>
                  <span className="text-xs text-muted-content">
                    {component.data.sizeHumanReadable} |{" "}
                    {component.dataContent?.split("\n").length ?? 0} lines
                  </span>
                </div>
              </div>
              {component.parseError && (
                <div className="alert alert-warning mb-3">
                  <span>
                    <strong>Parse Error:</strong> {component.parseError}
                  </span>
                </div>
              )}
              {renderComponentData(component)}
            </div>
          ))}
        </div>
      ) : selectedComponent && selectedComponent.dataContent ? (
        // Single Component View
        <>
          {selectedComponent.parseError && (
            <div className="alert alert-warning mb-4">
              <span>
                <strong>Parse Error:</strong> {selectedComponent.parseError}
              </span>
            </div>
          )}
          {renderComponentData(selectedComponent)}
          <div className="flex justify-between items-center mt-2">
            <div className="text-sm text-muted-content">
              Format:{" "}
              <span className="badge badge-sm">
                {selectedComponent.detectedFormat?.format.toUpperCase() ?? "UNKNOWN"}
              </span>
            </div>
            <div className="text-sm text-muted-content">
              {selectedComponent.data.sizeHumanReadable} |{" "}
              {selectedComponent.dataContent.split("\n").length} lines
            </div>
          </div>
        </>
      ) : (
        <div className="alert alert-info">
          <span>Please select a component with data to view raw content</span>
        </div>
      )}
    </Card>
  )
}
