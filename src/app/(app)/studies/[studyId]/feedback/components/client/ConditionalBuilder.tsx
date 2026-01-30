"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import VariableSelector from "./VariableSelector"
import StatsSelector from "./StatsSelector"
import { SelectField, FilterButtonWithDisplay, SyntaxPreview } from "./shared"
import type { FeedbackVariable } from "../../types"

interface ConditionalBuilderProps {
  variables: FeedbackVariable[]
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
  variables,
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

  // Get available variables for the condition builder
  const getAvailableVariables = useCallback(() => {
    return variables.map((v) => ({
      name: v.variableName,
      type: v.type,
    }))
  }, [variables])

  const variableOptions = useMemo(
    () =>
      getAvailableVariables().map((v) => ({
        value: v.name,
        label: `${v.name} (${v.type})`,
      })),
    [getAvailableVariables]
  )

  const modifierOptions = useMemo(
    () => [
      { value: "first", label: "First Value" },
      { value: "last", label: "Last Value" },
      { value: "all", label: "All Values" },
    ],
    []
  )

  // Get available metrics based on variable type
  const getAvailableMetrics = useCallback((variableType: string) => {
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
  }, [])

  // Get available operators based on variable type
  const getAvailableOperators = useCallback((variableType: string) => {
    // For arrays/objects, treat as string for operator selection
    const effectiveType =
      variableType === "array" || variableType === "object" ? "string" : variableType
    return OPERATORS.filter((op) => op.types.includes(effectiveType))
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

  const metricOptions = useMemo(() => {
    const METRICS = [
      { key: "avg", label: "Average", description: "Mean value" },
      { key: "median", label: "Median", description: "Middle value" },
      { key: "sd", label: "Std Dev", description: "Standard deviation" },
      { key: "count", label: "Count", description: "Number of trials" },
    ]

    const currentType = selectedVariable
      ? getAvailableVariables().find((v) => v.name === selectedVariable)?.type || "string"
      : "string"

    return getAvailableMetrics(currentType).map((m) => ({
      value: m.key,
      label: `${m.label} - ${m.description}`,
    }))
  }, [selectedVariable, getAvailableVariables, getAvailableMetrics])

  const operatorOptions = useMemo(() => {
    const currentType = getCurrentVariableType()
    return getAvailableOperators(currentType).map((op) => ({
      value: op.key,
      label: op.label,
    }))
  }, [getCurrentVariableType, getAvailableOperators])

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
    const variable = variables.find((v) => v.variableName === fieldName)
    return variable?.type || "string"
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
                    <SelectField
                      label="Variable"
                      value={selectedVariable}
                      onChange={(value) => {
                        setSelectedVariable(value)
                        setSelectedModifier("first")
                      }}
                      options={variableOptions}
                      placeholder="Select variable..."
                    />
                  </div>

                  <div className="flex-1">
                    <SelectField
                      label="Modifier"
                      value={selectedModifier}
                      onChange={setSelectedModifier}
                      options={modifierOptions}
                      disabled={!selectedVariable}
                    />
                  </div>
                </div>

                <FilterButtonWithDisplay
                  currentFilterClause={currentFilterClause}
                  onAddFilter={() => {
                    /* TODO: Add filter modal */
                  }}
                  onClearFilter={() => setCurrentFilterClause("")}
                  enabled={!!selectedVariable}
                />
              </div>
            )}

            {/* Statistical Condition Builder */}
            {conditionType === "statistic" && (
              <div className="space-y-3">
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <SelectField
                      label="Variable"
                      value={selectedVariable}
                      onChange={(value) => {
                        setSelectedVariable(value)
                        if (value) {
                          const variableType =
                            getAvailableVariables().find((v) => v.name === value)?.type || "string"
                          const availableMetrics = getAvailableMetrics(variableType)
                          if (availableMetrics.length > 0) {
                            setSelectedMetric(availableMetrics[0].key)
                          }
                        }
                      }}
                      options={variableOptions}
                      placeholder="Select variable..."
                    />
                  </div>

                  <div className="flex-1">
                    <SelectField
                      label="Statistic"
                      value={selectedMetric}
                      onChange={setSelectedMetric}
                      options={metricOptions}
                      disabled={!selectedVariable}
                    />
                  </div>
                </div>

                <FilterButtonWithDisplay
                  currentFilterClause={currentFilterClause}
                  onAddFilter={() => {
                    /* TODO: Add filter modal */
                  }}
                  onClearFilter={() => setCurrentFilterClause("")}
                  enabled={!!selectedVariable && !!selectedMetric}
                />
              </div>
            )}

            {/* Operator and Value */}
            <div className="flex items-end gap-2 mt-4">
              <div className="flex-1">
                <SelectField
                  label="Operator"
                  value={operator}
                  onChange={setOperator}
                  options={operatorOptions}
                  disabled={!selectedVariable}
                />
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

            <SyntaxPreview
              syntax={
                selectedVariable && operator && value
                  ? (() => {
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
                    })()
                  : ""
              }
              show={!!selectedVariable && !!operator && !!value}
            />
          </div>

          {/* Then Content */}
          <div>
            <label className="label">
              <span className="label-text">Then (show this if condition is true)</span>
            </label>
            {/* Toolbar for Then Content */}
            <div className="flex gap-2 mb-2">
              <VariableSelector variables={variables} onInsert={handleInsertVariable} />
              <StatsSelector variables={variables} onInsert={handleInsertStat} />
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
                  <VariableSelector variables={variables} onInsert={handleInsertVariable} />
                  <StatsSelector variables={variables} onInsert={handleInsertStat} />
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
