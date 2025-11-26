"use client"

import type { EnrichedJatosStudyResult } from "@/src/types/jatos"
import { extractVariables } from "../../../variables/utils/extractVariable"
import Card from "@/src/app/components/Card"
import Modal from "@/src/app/components/Modal"
import { useState, useEffect } from "react"
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
  const [selectedVariable, setSelectedVariable] = useState<ExtractedVariable | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDark, setIsDark] = useState(false)

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
