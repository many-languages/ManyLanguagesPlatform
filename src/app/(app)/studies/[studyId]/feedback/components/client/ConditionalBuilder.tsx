"use client"

import { useState, useEffect, useCallback } from "react"
import { EnrichedJatosStudyResult } from "@/src/types/jatos"
import VariableSelector from "./VariableSelector"
import StatsSelector from "./StatsSelector"
import FilterBuilder from "./FilterBuilder"

interface ConditionalBuilderProps {
  enrichedResult: EnrichedJatosStudyResult
  onInsert: (conditionalBlock: string) => void
  onClose: () => void
}

const OPERATORS = [
  { key: "==", label: "equals", types: ["string", "number", "boolean"] },
  { key: "!=", label: "not equals", types: ["string", "number", "boolean"] },
  { key: ">", label: "greater than", types: ["number"] },
  { key: "<", label: "less than", types: ["number"] },
  { key: ">=", label: "greater or equal", types: ["number"] },
  { key: "<=", label: "less or equal", types: ["number"] },
]

/**
 * Modal for building conditional if/else blocks
 */
export default function ConditionalBuilder({
  enrichedResult,
  onInsert,
  onClose,
}: ConditionalBuilderProps) {
  const [conditionType, setConditionType] = useState<"variable" | "statistic">("variable")
  const [selectedVariable, setSelectedVariable] = useState("")
  const [selectedModifier, setSelectedModifier] = useState("first")
  const [selectedMetric, setSelectedMetric] = useState("avg")
  const [operator, setOperator] = useState("==")
  const [value, setValue] = useState("")
  const [thenContent, setThenContent] = useState("")
  const [elseContent, setElseContent] = useState("")
  const [includeElse, setIncludeElse] = useState(false)
  const [focusedTextArea, setFocusedTextArea] = useState<"then" | "else">("then")
  const [currentFilterClause, setCurrentFilterClause] = useState("")

  const availableFields = extractAvailableFields(enrichedResult)

  // Get available variables for the condition builder
  const getAvailableVariables = useCallback(() => {
    return availableFields.map((field) => ({
      name: field.name,
      type: field.type,
    }))
  }, [availableFields])

  // Get available metrics based on variable type
  const getAvailableMetrics = (variableType: string) => {
    const METRICS = [
      { key: "avg", label: "Average", description: "Mean value" },
      { key: "median", label: "Median", description: "Middle value" },
      { key: "sd", label: "Std Dev", description: "Standard deviation" },
      { key: "count", label: "Count", description: "Number of trials" },
    ]

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

  // Get available operators based on variable type
  const getAvailableOperators = useCallback((variableType: string) => {
    return OPERATORS.filter((op) => op.types.includes(variableType))
  }, [])

  // Get current variable type for operator filtering
  const getCurrentVariableType = useCallback(() => {
    if (conditionType === "variable") {
      return selectedVariable
        ? getAvailableVariables().find((v) => v.name === selectedVariable)?.type || "string"
        : "string"
    } else if (conditionType === "statistic") {
      // For statistics, we're comparing the result (always numeric for avg/median/sd, count is always numeric)
      return "number"
    }
    return "string"
  }, [conditionType, selectedVariable, getAvailableVariables])

  // Reset operator when variable type changes
  useEffect(() => {
    const currentType = getCurrentVariableType()
    const availableOps = getAvailableOperators(currentType)

    // If current operator is not available for this type, reset to first available
    if (!availableOps.some((op) => op.key === operator)) {
      if (availableOps.length > 0) {
        setOperator(availableOps[0].key)
      }
    }
  }, [
    selectedVariable,
    conditionType,
    selectedMetric,
    operator,
    getCurrentVariableType,
    getAvailableOperators,
  ])

  // Handle variable insertion for condition
  const handleInsertVariable = (variableSyntax: string) => {
    if (focusedTextArea === "then") {
      setThenContent((prev) => prev + variableSyntax)
    } else if (focusedTextArea === "else") {
      setElseContent((prev) => prev + variableSyntax)
    }
  }

  // Handle stat insertion for condition
  const handleInsertStat = (statSyntax: string) => {
    if (focusedTextArea === "then") {
      setThenContent((prev) => prev + statSyntax)
    } else if (focusedTextArea === "else") {
      setElseContent((prev) => prev + statSyntax)
    }
  }

  // Handle filter insertion for condition
  const handleInsertFilter = (filterClause: string) => {
    setCurrentFilterClause(filterClause)
  }

  const generateConditionalBlock = () => {
    let expression = ""

    if (conditionType === "variable") {
      expression = `var:${selectedVariable}`
      if (selectedModifier !== "all") {
        expression += `:${selectedModifier}`
      }
      if (currentFilterClause) {
        expression += ` | where: ${currentFilterClause}`
      }
    } else if (conditionType === "statistic") {
      expression = `stat:${selectedVariable}.${selectedMetric}`
      if (currentFilterClause) {
        expression += ` | where: ${currentFilterClause}`
      }
    }

    expression += ` ${operator} ${value}`
    const elsePart = includeElse ? `{{else}}${elseContent}{{/if}}` : "{{/if}}"
    return `{{#if ${expression}}}${thenContent}${elsePart}`
  }

  const handleInsert = () => {
    if (selectedVariable && operator && value && thenContent) {
      const block = generateConditionalBlock()
      onInsert(block)
      onClose()
    }
  }

  const selectedFieldType = (fieldName: string) => {
    const field = availableFields.find((f) => f.name === fieldName)
    return field?.type || "string"
  }

  return (
    <div className="modal modal-open">
      <div className="modal-box w-11/12 max-w-3xl">
        <h3 className="font-bold text-lg mb-4">Add Conditional Block</h3>

        <div className="space-y-4">
          {/* Enhanced Condition Builder */}
          <div className="p-4 bg-base-100 rounded-lg">
            <h4 className="font-semibold mb-3">Condition Builder</h4>

            {/* Condition Type Selector */}
            <div className="mb-4">
              <label className="label">
                <span className="label-text">What do you want to check?</span>
              </label>
              <div className="flex gap-4">
                <label className="label cursor-pointer">
                  <input
                    type="radio"
                    name="conditionType"
                    className="radio"
                    checked={conditionType === "variable"}
                    onChange={() => setConditionType("variable")}
                  />
                  <span className="label-text ml-2">Variable Value</span>
                </label>
                <label className="label cursor-pointer">
                  <input
                    type="radio"
                    name="conditionType"
                    className="radio"
                    checked={conditionType === "statistic"}
                    onChange={() => setConditionType("statistic")}
                  />
                  <span className="label-text ml-2">Statistical Value</span>
                </label>
              </div>
            </div>

            {/* Variable Condition Builder */}
            {conditionType === "variable" && (
              <div className="space-y-3">
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <label className="label">
                      <span className="label-text">Variable</span>
                    </label>
                    <select
                      className="select select-bordered w-full"
                      value={selectedVariable}
                      onChange={(e) => {
                        setSelectedVariable(e.target.value)
                        setSelectedModifier("first") // Reset modifier when variable changes
                      }}
                    >
                      <option value="">Select variable...</option>
                      {getAvailableVariables().map((variable) => (
                        <option key={variable.name} value={variable.name}>
                          {variable.name} ({variable.type})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex-1">
                    <label className="label">
                      <span className="label-text">Modifier</span>
                    </label>
                    <select
                      className="select select-bordered w-full"
                      value={selectedModifier}
                      onChange={(e) => setSelectedModifier(e.target.value)}
                    >
                      <option value="first">First Value</option>
                      <option value="last">Last Value</option>
                      <option value="all">All Values</option>
                    </select>
                  </div>
                </div>

                {/* Filter for Variable */}
                {selectedVariable && (
                  <div>
                    <button
                      className="btn btn-sm btn-outline"
                      onClick={() => {
                        /* TODO: Add filter modal */
                      }}
                    >
                      {currentFilterClause ? "Edit Filter" : "Add Filter"}
                    </button>
                    {currentFilterClause && (
                      <div className="mt-2 p-2 bg-base-200 rounded text-xs">
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
              </div>
            )}

            {/* Statistical Condition Builder */}
            {conditionType === "statistic" && (
              <div className="space-y-3">
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <label className="label">
                      <span className="label-text">Variable</span>
                    </label>
                    <select
                      className="select select-bordered w-full"
                      value={selectedVariable}
                      onChange={(e) => {
                        const newVariable = e.target.value
                        setSelectedVariable(newVariable)

                        if (newVariable) {
                          const variableType =
                            getAvailableVariables().find((v) => v.name === newVariable)?.type ||
                            "string"
                          const availableMetrics = getAvailableMetrics(variableType)
                          if (availableMetrics.length > 0) {
                            setSelectedMetric(availableMetrics[0].key)
                          }
                        }
                      }}
                    >
                      <option value="">Select variable...</option>
                      {getAvailableVariables().map((variable) => (
                        <option key={variable.name} value={variable.name}>
                          {variable.name} ({variable.type})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex-1">
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
                          ? getAvailableVariables().find((v) => v.name === selectedVariable)
                              ?.type || "string"
                          : "string"
                      ).map((metric) => (
                        <option key={metric.key} value={metric.key}>
                          {metric.label} - {metric.description}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Filter for Statistic */}
                {selectedVariable && selectedMetric && (
                  <div>
                    <button
                      className="btn btn-sm btn-outline"
                      onClick={() => {
                        /* TODO: Add filter modal */
                      }}
                    >
                      {currentFilterClause ? "Edit Filter" : "Add Filter"}
                    </button>
                    {currentFilterClause && (
                      <div className="mt-2 p-2 bg-base-200 rounded text-xs">
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
              </div>
            )}

            {/* Operator and Value */}
            <div className="flex items-end gap-2 mt-4">
              <div className="flex-1">
                <label className="label">
                  <span className="label-text">Operator</span>
                </label>
                <select
                  className="select select-bordered w-full"
                  value={operator}
                  onChange={(e) => setOperator(e.target.value)}
                >
                  {getAvailableOperators(getCurrentVariableType()).map((op) => (
                    <option key={op.key} value={op.key}>
                      {op.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex-1">
                <label className="label">
                  <span className="label-text">Value</span>
                </label>
                <input
                  type={selectedFieldType(selectedVariable) === "number" ? "number" : "text"}
                  className="input input-bordered w-full"
                  placeholder={
                    selectedFieldType(selectedVariable) === "boolean"
                      ? "true or false"
                      : "Enter value..."
                  }
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                />
              </div>
            </div>

            {/* Live Preview */}
            {selectedVariable && operator && value && (
              <div className="mt-4 p-3 bg-base-200 rounded">
                <div className="text-sm font-medium mb-1">Preview:</div>
                <code className="text-sm">
                  {(() => {
                    let expression = ""
                    if (conditionType === "variable") {
                      expression = `var:${selectedVariable}`
                      if (selectedModifier !== "all") {
                        expression += `:${selectedModifier}`
                      }
                      if (currentFilterClause) {
                        expression += ` | where: ${currentFilterClause}`
                      }
                    } else if (conditionType === "statistic") {
                      expression = `stat:${selectedVariable}.${selectedMetric}`
                      if (currentFilterClause) {
                        expression += ` | where: ${currentFilterClause}`
                      }
                    }
                    return `{{#if ${expression} ${operator} ${value}}}`
                  })()}
                </code>
              </div>
            )}
          </div>

          {/* Then Content */}
          <div>
            <label className="label">
              <span className="label-text">Then (show this if condition is true)</span>
            </label>
            {/* Toolbar for Then Content */}
            <div className="flex gap-2 mb-2">
              <VariableSelector enrichedResult={enrichedResult} onInsert={handleInsertVariable} />
              <StatsSelector enrichedResult={enrichedResult} onInsert={handleInsertStat} />
            </div>
            <textarea
              className="textarea textarea-bordered w-full h-24"
              placeholder="Enter content to show when condition is true..."
              value={thenContent}
              onChange={(e) => setThenContent(e.target.value)}
              onFocus={() => setFocusedTextArea("then")}
            />
          </div>

          {/* Else Content */}
          <div>
            <label className="label cursor-pointer">
              <input
                type="checkbox"
                className="checkbox"
                checked={includeElse}
                onChange={(e) => setIncludeElse(e.target.checked)}
              />
              <span className="label-text ml-2">Include else clause</span>
            </label>
            {includeElse && (
              <div>
                {/* Toolbar for Else Content */}
                <div className="flex gap-2 mb-2">
                  <VariableSelector
                    enrichedResult={enrichedResult}
                    onInsert={handleInsertVariable}
                  />
                  <StatsSelector enrichedResult={enrichedResult} onInsert={handleInsertStat} />
                </div>
                <textarea
                  className="textarea textarea-bordered w-full h-24"
                  placeholder="Enter content to show when condition is false..."
                  value={elseContent}
                  onChange={(e) => setElseContent(e.target.value)}
                  onFocus={() => setFocusedTextArea("else")}
                />
              </div>
            )}
          </div>
        </div>

        {/* Preview */}
        <div className="mt-4 p-4 bg-base-200 rounded-lg">
          <h4 className="font-semibold mb-2">Preview:</h4>
          <div className="text-sm">
            <code className="block whitespace-pre-wrap">
              {selectedVariable && operator && value && thenContent
                ? generateConditionalBlock()
                : "Complete the form to see preview..."}
            </code>
          </div>
        </div>

        <div className="modal-action">
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleInsert}
            disabled={!selectedVariable || !operator || !value || !thenContent}
          >
            Insert Conditional
          </button>
        </div>
      </div>
    </div>
  )
}

interface AvailableField {
  name: string
  type: "string" | "number" | "boolean"
  example: any
}

function extractAvailableFields(enrichedResult: EnrichedJatosStudyResult): AvailableField[] {
  const fieldMap = new Map<string, AvailableField>()

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
      data.forEach((trial) => {
        if (typeof trial === "object" && trial !== null) {
          Object.entries(trial).forEach(([key, value]) => {
            if (excludedFields.has(key)) return

            if (!fieldMap.has(key)) {
              fieldMap.set(key, {
                name: key,
                type: getFieldType(value),
                example: value,
              })
            }
          })
        }
      })
    } else if (typeof data === "object") {
      Object.entries(data).forEach(([key, value]) => {
        if (excludedFields.has(key)) return

        fieldMap.set(key, {
          name: key,
          type: getFieldType(value),
          example: value,
        })
      })
    }
  })

  return Array.from(fieldMap.values()).sort((a, b) => a.name.localeCompare(b.name))
}

function getFieldType(value: any): "string" | "number" | "boolean" {
  if (typeof value === "number") return "number"
  if (typeof value === "boolean") return "boolean"
  return "string"
}
