"use client"

import type { EnrichedJatosStudyResult } from "@/src/types/jatos"
import { extractVariables } from "../../../variables/utils/extractVariable"
import { analyzeOriginalStructure } from "../../../variables/utils/structureAnalyzer/analyzeOriginalStructure"
import Card from "@/src/app/components/Card"
import Modal from "@/src/app/components/Modal"
import StructureAnalysisCard from "./StructureAnalysisCard"
import JsonSyntaxHighlighter from "@/src/app/components/JsonSyntaxHighlighter"
import Table from "@/src/app/components/Table"
import { useState, useMemo } from "react"
import type { ExtractedVariable } from "../../../variables/types"
import type { ColumnDef } from "@tanstack/react-table"

interface VariableExtractionPreviewProps {
  enrichedResult: EnrichedJatosStudyResult
}

export default function VariableExtractionPreview({
  enrichedResult,
}: VariableExtractionPreviewProps) {
  // Extract variables with full details
  const extractionResult = useMemo(() => extractVariables(enrichedResult), [enrichedResult])
  const extractedVariables = extractionResult.variables
  const originalStructureAnalysis = useMemo(
    () => analyzeOriginalStructure(enrichedResult),
    [enrichedResult]
  )

  // State for modal
  const [selectedVariable, setSelectedVariable] = useState<ExtractedVariable | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

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

  // Function to handle showing all values of a variable
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

  // Define table columns
  const columns = useMemo<ColumnDef<ExtractedVariable>[]>(
    () => [
      {
        accessorKey: "variableName",
        header: "Variable Name",
        cell: ({ row }) => (
          <span className="font-mono font-medium">{row.original.variableName}</span>
        ),
      },
      {
        accessorKey: "type",
        header: "Type",
        cell: ({ row }) => {
          const variable = row.original
          const badgeClass =
            variable.type === "primitive"
              ? "badge-primary"
              : variable.type === "array"
              ? "badge-secondary"
              : "badge-accent"
          return (
            <div
              className="tooltip tooltip-top cursor-help"
              data-tip={getTypeTooltip(variable.type)}
            >
              <span className={`badge ${badgeClass}`}>{variable.type}</span>
            </div>
          )
        },
      },
      {
        accessorKey: "occurrences",
        header: "Occurrences",
        cell: ({ row }) => row.original.occurrences,
      },
      {
        accessorKey: "exampleValue",
        header: "Example Value",
        cell: ({ row }) => (
          <span className="font-mono text-xs max-w-xs truncate block">
            {row.original.exampleValue}
          </span>
        ),
      },
      {
        id: "allValues",
        header: "All Values",
        cell: ({ row }) => (
          <button className="btn btn-sm btn-outline" onClick={() => handleShowValues(row.original)}>
            Show
          </button>
        ),
        enableSorting: false,
        enableColumnFilter: false,
      },
    ],
    []
  )

  return (
    <div className="space-y-6">
      {/* Structure Analysis Card */}
      <StructureAnalysisCard
        enrichedResult={enrichedResult}
        originalStructureAnalysis={originalStructureAnalysis}
        extractionResult={extractionResult}
      />

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
            <Table
              columns={columns}
              data={extractedVariables}
              enableSorting={true}
              enableFilters={true}
              addPagination={false}
              classNames={{
                table: "table table-zebra",
              }}
            />
          </div>
        )}

        {/* Warnings */}
        {extractionResult.warnings.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-semibold mb-2 text-warning">Warnings</h3>
            <div className="space-y-2">
              {extractionResult.warnings.map((warning, index) => (
                <div key={index} className="alert alert-warning">
                  <span>{warning}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Errors (Skipped Values) */}
        {extractionResult.skippedValues.filter((s) => s.severity === "error").length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-semibold mb-2 text-error">
              Errors - Skipped Values (
              {extractionResult.skippedValues.filter((s) => s.severity === "error").length})
            </h3>
            <div className="card bg-base-200 p-4">
              <p className="text-xs text-muted-content mb-3">
                These values were found but could not be extracted as variables and were skipped.
                See reasons below.
              </p>
              <div className="overflow-x-auto">
                <table className="table table-zebra table-sm">
                  <thead>
                    <tr>
                      <th>Path</th>
                      <th>Reason</th>
                      <th>Context</th>
                      <th>Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {extractionResult.skippedValues
                      .filter((s) => s.severity === "error")
                      .map((skipped, index) => (
                        <tr key={index}>
                          <td className="font-mono text-xs">
                            {skipped.path || <span className="text-muted-content">(root)</span>}
                          </td>
                          <td>
                            <span className="badge badge-error badge-sm">
                              {skipped.reason.replace(/_/g, " ")}
                            </span>
                          </td>
                          <td className="text-xs">{skipped.context}</td>
                          <td className="font-mono text-xs max-w-xs truncate">
                            {typeof skipped.value === "object"
                              ? JSON.stringify(skipped.value)
                              : String(skipped.value)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
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
                    <JsonSyntaxHighlighter code={jsonString} language="json" />
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
