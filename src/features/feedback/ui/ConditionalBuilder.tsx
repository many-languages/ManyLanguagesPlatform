"use client"

import { useState, useCallback, useMemo } from "react"
import VariableSelector from "./VariableSelector"
import StatsSelector from "./StatsSelector"
import FilterBuilder from "./FilterBuilder"
import { SelectField, FilterButtonWithDisplay, SyntaxPreview } from "./shared"
import type { FeedbackVariable } from "@/src/features/feedback/types"
import { Textarea } from "@/src/components/ui/fields"
import { getMetricsForVariableType } from "@/src/features/feedback/domain/feedbackVariableMetrics"
import { getConditionalOperators } from "@/src/features/feedback/domain/feedbackDslOperators"
import {
  buildConditionalBlock,
  buildConditionalPreview,
} from "@/src/features/feedback/domain/buildFeedbackDslExpression"

interface ConditionalBuilderProps {
  variables: FeedbackVariable[]
  onInsert: (conditionalBlock: string) => void
  onClose: () => void
}

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
  const [showFilterBuilder, setShowFilterBuilder] = useState(false)

  const getVariableSyntaxKey = useCallback((variable: FeedbackVariable) => {
    return variable.dslKey ?? variable.variableName
  }, [])

  const findVariableBySyntaxKey = useCallback(
    (syntaxKey: string) => variables.find((v) => getVariableSyntaxKey(v) === syntaxKey),
    [getVariableSyntaxKey, variables]
  )

  const variableOptions = useMemo(
    () =>
      variables.map((v) => ({
        value: getVariableSyntaxKey(v),
        label: `${v.variableName} (${v.type})`,
      })),
    [getVariableSyntaxKey, variables]
  )

  const modifierOptions = useMemo(
    () => [
      { value: "first", label: "First Value - Show only first occurrence" },
      { value: "last", label: "Last Value - Show only last occurrence" },
    ],
    []
  )

  const currentVariableType = useMemo(() => {
    if (conditionType === "statistic") return "number"
    return selectedVariable ? findVariableBySyntaxKey(selectedVariable)?.type ?? "string" : "string"
  }, [conditionType, findVariableBySyntaxKey, selectedVariable])

  const metricOptions = useMemo(
    () =>
      getMetricsForVariableType(
        selectedVariable ? findVariableBySyntaxKey(selectedVariable)?.type ?? "string" : "string"
      ).map((m) => ({ value: m.key, label: `${m.label} - ${m.description}` })),
    [findVariableBySyntaxKey, selectedVariable]
  )

  const operatorOptions = useMemo(
    () =>
      getConditionalOperators(currentVariableType).map((op) => ({
        value: op.key,
        label: op.label,
      })),
    [currentVariableType]
  )

  const resetOperatorForType = useCallback(
    (variableType: string) => {
      const availableOps = getConditionalOperators(variableType)
      if (!availableOps.some((op) => op.key === operator) && availableOps.length > 0) {
        setOperator(availableOps[0].key)
      }
    },
    [operator]
  )

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

  const handleInsert = () => {
    if (selectedVariable && operator && value && thenContent) {
      const block = buildConditionalBlock({
        conditionType,
        selectedVariable,
        selectedModifier,
        selectedMetric,
        filterClause: currentFilterClause,
        operator,
        value,
        thenContent,
        elseContent,
        includeElse,
      })
      onInsert(block)
      onClose()
    }
  }

  const selectedFieldType = (fieldName: string) =>
    findVariableBySyntaxKey(fieldName)?.type ?? "string"

  const handleFilterInsert = (filterClause: string) => {
    setCurrentFilterClause(filterClause.replace(/^\s*\|\s*where:\s*/, ""))
    setShowFilterBuilder(false)
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
                    onChange={() => {
                      setConditionType("variable")
                      const newType = selectedVariable
                        ? findVariableBySyntaxKey(selectedVariable)?.type ?? "string"
                        : "string"
                      resetOperatorForType(newType)
                    }}
                  />
                  <span className="label-text ml-2">Variable Value</span>
                </label>
                <label className="label cursor-pointer">
                  <input
                    type="radio"
                    name="conditionType"
                    className="radio"
                    checked={conditionType === "statistic"}
                    onChange={() => {
                      setConditionType("statistic")
                      resetOperatorForType("number")
                    }}
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
                        const newType = value
                          ? findVariableBySyntaxKey(value)?.type ?? "string"
                          : "string"
                        resetOperatorForType(newType)
                      }}
                      options={variableOptions}
                      placeholder="Select variable..."
                    />
                  </div>

                  <div className="flex-1">
                    <SelectField
                      label="Value"
                      hint="Conditionals evaluate one value. Use filters or stats for multi-row logic."
                      value={selectedModifier}
                      onChange={setSelectedModifier}
                      options={modifierOptions}
                      disabled={!selectedVariable}
                    />
                  </div>
                </div>

                <FilterButtonWithDisplay
                  currentFilterClause={currentFilterClause}
                  onAddFilter={() => setShowFilterBuilder(true)}
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
                          const variableType = findVariableBySyntaxKey(value)?.type ?? "string"
                          const availableMetrics = getMetricsForVariableType(variableType)
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
                  onAddFilter={() => setShowFilterBuilder(true)}
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
              syntax={buildConditionalPreview({
                conditionType,
                selectedVariable,
                selectedModifier,
                selectedMetric,
                filterClause: currentFilterClause,
                operator,
                value,
              })}
              show={!!selectedVariable && !!operator && !!value}
            />
          </div>

          {/* Then Content */}
          <div>
            {/* Toolbar for Then Content */}
            <div className="flex gap-2 mb-2">
              <VariableSelector variables={variables} onInsert={handleInsertVariable} />
              <StatsSelector variables={variables} onInsert={handleInsertStat} />
            </div>
            <Textarea
              label="Then (show this if condition is true)"
              className="w-full h-24"
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
                <Textarea
                  className="w-full h-24"
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
                ? buildConditionalBlock({
                    conditionType,
                    selectedVariable,
                    selectedModifier,
                    selectedMetric,
                    filterClause: currentFilterClause,
                    operator,
                    value,
                    thenContent,
                    elseContent,
                    includeElse,
                  })
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
      <FilterBuilder
        open={showFilterBuilder}
        variables={variables}
        onInsert={handleFilterInsert}
        onClose={() => setShowFilterBuilder(false)}
      />
    </div>
  )
}
