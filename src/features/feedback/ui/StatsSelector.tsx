"use client"

import { useState, useMemo } from "react"
import FilterBuilder from "./FilterBuilder"
import { SelectField, FilterButtonWithDisplay, SyntaxPreview } from "./shared"
import type { FeedbackVariable } from "@/src/features/feedback/types"
import { getMetricsForVariableType } from "@/src/features/feedback/domain/feedbackVariableMetrics"
import { buildStatExpression } from "@/src/features/feedback/domain/buildFeedbackDslExpression"

interface StatsSelectorProps {
  variables: FeedbackVariable[]
  onInsert: (statExpression: string) => void
  markdown?: string
}

/**
 * Component for selecting variables and their statistics
 * Shows dropdowns for variable selection and stat type, with insert button
 */
export default function StatsSelector({ variables, onInsert, markdown }: StatsSelectorProps) {
  const [selectedVariable, setSelectedVariable] = useState("")
  const [selectedMetric, setSelectedMetric] = useState("avg")
  const [selectedScope, setSelectedScope] = useState<"within" | "across">("within")
  const [showFilterBuilder, setShowFilterBuilder] = useState(false)
  const [currentFilterClause, setCurrentFilterClause] = useState("")

  const variableOptions = useMemo(
    () =>
      variables.map((v) => ({
        value: v.variableName,
        label: `${v.variableName} (${v.type})`,
      })),
    [variables]
  )

  const currentVariableType = useMemo(
    () =>
      selectedVariable
        ? variables.find((v) => v.variableName === selectedVariable)?.type ?? "string"
        : "string",
    [selectedVariable, variables]
  )

  const metricOptions = useMemo(
    () =>
      getMetricsForVariableType(currentVariableType).map((m) => ({
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
    // currentFilterClause arrives from FilterBuilder with " | where: " prefix; strip it for the builder
    const rawClause = currentFilterClause.replace(/^\s*\|\s*where:\s*/, "")
    return buildStatExpression(
      selectedVariable,
      selectedMetric,
      selectedScope,
      rawClause || undefined
    )
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
                  variables.find((v) => v.variableName === value)?.type ?? "string"
                const availableMetrics = getMetricsForVariableType(variableType)
                if (availableMetrics.length > 0) setSelectedMetric(availableMetrics[0].key)
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
                ⚠️ In preview, this uses all pilot results. In actual feedback, it uses all
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
          variables={variables}
          onInsert={handleFilterInsert}
          onClose={() => setShowFilterBuilder(false)}
        />
      )}
    </div>
  )
}
