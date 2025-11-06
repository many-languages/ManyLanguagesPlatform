"use client"

import { useState, useMemo } from "react"
import { EnrichedJatosStudyResult } from "@/src/types/jatos"
import FilterBuilder from "./FilterBuilder"
import { extractAllVariables } from "../../utils/extractVariable"
import { SelectField, FilterButtonWithDisplay, SyntaxPreview } from "./shared"

interface StatsSelectorProps {
  enrichedResult: EnrichedJatosStudyResult
  onInsert: (statExpression: string) => void
  markdown?: string
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

  const variableOptions = useMemo(
    () =>
      availableVariables.map((v) => ({
        value: v.name,
        label: `${v.name} (${v.type})`,
      })),
    [availableVariables]
  )

  const getAvailableMetrics = (variableType: string) => {
    switch (variableType) {
      case "number":
        return METRICS
      case "boolean":
        return METRICS.filter((metric) => metric.key === "count")
      case "string":
        return METRICS.filter((metric) => metric.key === "count")
      default:
        return METRICS.filter((metric) => metric.key === "count")
    }
  }

  const currentVariableType = useMemo(() => {
    return selectedVariable
      ? availableVariables.find((v) => v.name === selectedVariable)?.type || "string"
      : "string"
  }, [selectedVariable, availableVariables])

  const metricOptions = useMemo(
    () =>
      getAvailableMetrics(currentVariableType).map((m) => ({
        value: m.key,
        label: `${m.label} - ${m.description}`,
      })),
    [currentVariableType]
  )

  const scopeOptions = useMemo(
    () => [
      { value: "within", label: "Within result (across trials for this participant)" },
      { value: "across", label: "Across all results (across all participants)" },
    ],
    []
  )

  const generateSyntax = useMemo(() => {
    if (!selectedVariable || !selectedMetric) return ""
    let syntax = `{{ stat:${selectedVariable}.${selectedMetric}:${selectedScope}`
    if (currentFilterClause) {
      syntax += currentFilterClause
    }
    syntax += " }}"
    return syntax
  }, [selectedVariable, selectedMetric, selectedScope, currentFilterClause])

  const handleInsert = () => {
    if (selectedVariable && selectedMetric) {
      onInsert(generateSyntax)
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

  return (
    <div className="dropdown dropdown-hover">
      <label tabIndex={0} className="btn btn-sm btn-outline m-1">
        Insert Stat ⌄
      </label>
      <div tabIndex={0} className="dropdown-content menu bg-base-200 rounded-box shadow p-4 w-80">
        <div className="space-y-3">
          <SelectField
            label="Variable"
            value={selectedVariable}
            onChange={(value) => {
              setSelectedVariable(value)
              if (value) {
                const variableType =
                  availableVariables.find((v) => v.name === value)?.type || "string"
                const availableMetrics = getAvailableMetrics(variableType)
                if (availableMetrics.length > 0) {
                  setSelectedMetric(availableMetrics[0].key)
                }
              }
            }}
            options={variableOptions}
            placeholder="Select variable..."
          />

          <SelectField
            label="Statistic"
            value={selectedMetric}
            onChange={setSelectedMetric}
            options={metricOptions}
            disabled={!selectedVariable}
          />

          <div>
            <SelectField
              label="Scope"
              value={selectedScope}
              onChange={(value) => setSelectedScope(value as "within" | "across")}
              options={scopeOptions}
            />
            {selectedScope === "across" && (
              <div className="text-xs text-warning mt-1">
                ⚠️ In preview, this uses all "test" results. In actual feedback, it uses all
                participant results.
              </div>
            )}
          </div>

          <FilterButtonWithDisplay
            currentFilterClause={currentFilterClause}
            onAddFilter={() => setShowFilterBuilder(true)}
            onClearFilter={() => setCurrentFilterClause("")}
            enabled={!!selectedVariable && !!selectedMetric}
          />

          <SyntaxPreview syntax={generateSyntax} show={!!selectedVariable && !!selectedMetric} />

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
