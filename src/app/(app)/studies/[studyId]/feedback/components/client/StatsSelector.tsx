"use client"

import { useState } from "react"
import { EnrichedJatosStudyResult } from "@/src/types/jatos"
import FilterBuilder from "./FilterBuilder"

interface StatsSelectorProps {
  enrichedResult: EnrichedJatosStudyResult
  onInsert: (statExpression: string) => void
  markdown?: string
}

interface AvailableVariable {
  name: string
  type: "string" | "number" | "boolean"
  example: any
}

const METRICS = [
  { key: "avg", label: "Average", description: "Mean value" },
  { key: "median", label: "Median", description: "Middle value" },
  { key: "sd", label: "Std Dev", description: "Standard deviation" },
  { key: "count", label: "Count", description: "Number of trials" },
]

/**
 * Component for selecting variables and their statistics
 * Shows dropdowns for variable selection and stat type, with insert button
 */
export default function StatsSelector({ enrichedResult, onInsert, markdown }: StatsSelectorProps) {
  const [selectedVariable, setSelectedVariable] = useState("")
  const [selectedMetric, setSelectedMetric] = useState("avg")
  const [selectedScope, setSelectedScope] = useState<"within" | "across">("within")
  const [showFilterBuilder, setShowFilterBuilder] = useState(false)
  const [currentFilterClause, setCurrentFilterClause] = useState("")

  const availableVariables = extractAllVariables(enrichedResult)

  const handleInsert = () => {
    if (selectedVariable && selectedMetric) {
      let syntax = `{{ stat:${selectedVariable}.${selectedMetric}:${selectedScope}`

      if (currentFilterClause) {
        syntax += currentFilterClause
      }

      syntax += " }}"

      onInsert(syntax)
      // Clear selections after insert for next use
      setSelectedVariable("")
      setSelectedMetric("avg")
      setSelectedScope("within")
      setCurrentFilterClause("")
    }
  }

  const handleFilterInsert = (filterClause: string) => {
    setCurrentFilterClause(filterClause)
    setShowFilterBuilder(false)
  }

  const getAvailableMetrics = (variableType: string) => {
    switch (variableType) {
      case "number":
        // All metrics make sense for numeric variables
        return METRICS
      case "boolean":
        // Only count makes sense for boolean variables
        return METRICS.filter((metric) => metric.key === "count")
      case "string":
        // Only count makes sense for string variables
        return METRICS.filter((metric) => metric.key === "count")
      default:
        // Fallback to count only
        return METRICS.filter((metric) => metric.key === "count")
    }
  }

  return (
    <div className="dropdown dropdown-hover">
      <label tabIndex={0} className="btn btn-sm btn-outline m-1">
        Insert Stat ⌄
      </label>
      <div tabIndex={0} className="dropdown-content menu bg-base-200 rounded-box shadow p-4 w-80">
        <div className="space-y-3">
          {/* Variable Selection */}
          <div>
            <label className="label">
              <span className="label-text">Variable</span>
            </label>
            <select
              className="select select-bordered w-full"
              value={selectedVariable}
              onChange={(e) => {
                const newVariable = e.target.value
                setSelectedVariable(newVariable)

                // Auto-select appropriate metric based on variable type
                if (newVariable) {
                  const variableType =
                    availableVariables.find((v) => v.name === newVariable)?.type || "string"
                  const availableMetrics = getAvailableMetrics(variableType)
                  if (availableMetrics.length > 0) {
                    setSelectedMetric(availableMetrics[0].key)
                  }
                }
              }}
            >
              <option value="">Select variable...</option>
              {availableVariables.map((variable) => (
                <option key={variable.name} value={variable.name}>
                  {variable.name} ({variable.type})
                </option>
              ))}
            </select>
          </div>

          {/* Metric Selection */}
          <div>
            <label className="label">
              <span className="label-text">Statistic</span>
            </label>
            <select
              className="select select-bordered w-full"
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
            >
              {getAvailableMetrics(
                selectedVariable
                  ? availableVariables.find((v) => v.name === selectedVariable)?.type || "string"
                  : "string"
              ).map((metric) => (
                <option key={metric.key} value={metric.key}>
                  {metric.label} - {metric.description}
                </option>
              ))}
            </select>
          </div>

          {/* Scope Selection */}
          <div>
            <label className="label">
              <span className="label-text">Scope</span>
            </label>
            <select
              className="select select-bordered w-full"
              value={selectedScope}
              onChange={(e) => setSelectedScope(e.target.value as "within" | "across")}
            >
              <option value="within">Within result (across trials for this participant)</option>
              <option value="across">Across all results (across all participants)</option>
            </select>
            {selectedScope === "across" && (
              <div className="text-xs text-warning mt-1">
                ⚠️ In preview, this uses all "test" results. In actual feedback, it uses all
                participant results.
              </div>
            )}
          </div>

          {/* Filter Button */}
          {selectedVariable && selectedMetric && (
            <div>
              <button
                className="btn btn-sm btn-outline w-full"
                onClick={() => setShowFilterBuilder(true)}
              >
                {currentFilterClause ? "Edit Filter" : "Add Filter"}
              </button>
              {currentFilterClause && (
                <div className="mt-2 p-2 bg-base-100 rounded text-xs">
                  <div className="font-medium">Current filter:</div>
                  <code>{currentFilterClause}</code>
                  <button
                    className="btn btn-xs btn-error ml-2"
                    onClick={() => setCurrentFilterClause("")}
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Preview */}
          {selectedVariable && selectedMetric && (
            <div className="bg-base-100 p-2 rounded">
              <div className="text-sm font-medium">Preview:</div>
              <code className="text-sm">
                {`{{ stat:${selectedVariable}.${selectedMetric}:${selectedScope}${currentFilterClause} }}`}
              </code>
            </div>
          )}

          {/* Insert Button */}
          <button
            className="btn btn-primary btn-sm w-full"
            onClick={handleInsert}
            disabled={!selectedVariable || !selectedMetric}
          >
            Insert Stat
          </button>
        </div>
      </div>

      {/* FilterBuilder Modal */}
      {showFilterBuilder && (
        <FilterBuilder
          enrichedResult={enrichedResult}
          onInsert={handleFilterInsert}
          onClose={() => setShowFilterBuilder(false)}
        />
      )}
    </div>
  )
}

/**
 * Extract all variables from enriched JATOS result
 */
function extractAllVariables(enrichedResult: EnrichedJatosStudyResult): AvailableVariable[] {
  const variableMap = new Map<string, AvailableVariable>()

  // Excluded jsPsych metadata fields
  const excludedFields = new Set([
    "trial_type",
    "trial_index",
    "time_elapsed",
    "internal_node_id",
    "success",
    "timeout",
    "failed_images",
    "failed_audio",
    "failed_video",
  ])

  enrichedResult.componentResults.forEach((component) => {
    const data = component.parsedData ?? null
    if (!data) return

    if (Array.isArray(data)) {
      // jsPsych-style: array of trial objects
      data.forEach((trial) => {
        if (typeof trial === "object" && trial !== null) {
          Object.entries(trial).forEach(([key, value]) => {
            if (excludedFields.has(key)) return

            if (!variableMap.has(key)) {
              variableMap.set(key, {
                name: key,
                type: getFieldType(value),
                example: value,
              })
            }
          })
        }
      })
    } else if (typeof data === "object") {
      // SurveyJS-style: single object with responses
      Object.entries(data).forEach(([key, value]) => {
        if (excludedFields.has(key)) return

        variableMap.set(key, {
          name: key,
          type: getFieldType(value),
          example: value,
        })
      })
    }
  })

  return Array.from(variableMap.values()).sort((a, b) => a.name.localeCompare(b.name))
}

function getFieldType(value: any): "string" | "number" | "boolean" {
  if (typeof value === "number") return "number"
  if (typeof value === "boolean") return "boolean"
  return "string"
}
