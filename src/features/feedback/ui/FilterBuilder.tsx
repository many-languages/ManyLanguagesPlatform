"use client"

import { useState, useMemo } from "react"
import { SelectField, SyntaxPreview } from "./shared"
import type { FeedbackVariable } from "@/src/features/feedback/types"
import { getFilterOperators } from "@/src/features/feedback/domain/feedbackDslOperators"
import {
  buildFilterClause,
  type FilterCondition,
} from "@/src/features/feedback/domain/buildFeedbackDslExpression"

interface FilterBuilderProps {
  variables: FeedbackVariable[]
  onInsert: (filterClause: string) => void
  onClose: () => void
}

const MAX_CONDITIONS = 3

export default function FilterBuilder({ variables, onInsert, onClose }: FilterBuilderProps) {
  const [conditions, setConditions] = useState<FilterCondition[]>([
    { field: "", operator: "==", value: "" },
  ])

  const fieldOptions = useMemo(
    () =>
      variables.map((v) => ({
        value: v.variableName,
        label: `${v.variableName} (${v.type})`,
      })),
    [variables]
  )

  const updateCondition = (index: number, updates: Partial<FilterCondition>) => {
    setConditions((prev) =>
      prev.map((condition, i) => (i === index ? { ...condition, ...updates } : condition))
    )
  }

  const addCondition = () => {
    if (conditions.length < MAX_CONDITIONS) {
      setConditions([
        ...conditions,
        { field: "", operator: "==", value: "", logicalOperator: "and" },
      ])
    }
  }

  const removeCondition = (index: number) => {
    setConditions((prev) => prev.filter((_, i) => i !== index))
  }

  const handleInsert = () => {
    const clause = buildFilterClause(conditions)
    if (clause) {
      onInsert(` | where: ${clause}`)
      onClose()
    }
  }

  const getFieldType = (index: number): string => {
    const field = conditions[index]?.field
    if (!field) return "string"
    return variables.find((v) => v.variableName === field)?.type ?? "string"
  }

  const getOperatorOptions = (index: number) =>
    getFilterOperators(getFieldType(index)).map((op) => ({ value: op.key, label: op.label }))

  const getPlaceholder = (fieldType: string, operator: string) => {
    if (fieldType === "boolean") {
      return "true or false"
    }
    if (fieldType === "number") {
      return "e.g., 100, 2.5"
    }
    if (operator === "in") {
      return "comma-separated values"
    }
    return "enter value"
  }

  const filterPreview = useMemo(() => {
    const clause = buildFilterClause(conditions)
    return clause ? `| where: ${clause}` : ""
  }, [conditions])

  return (
    <div className="modal modal-open">
      <div className="modal-box w-11/12 max-w-2xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">Add Filter Conditions</h3>
          <button className="btn btn-sm btn-circle btn-ghost" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {conditions.map((condition, index) => (
            <div key={index}>
              <div className="flex items-end gap-2 p-4 bg-base-100 rounded-lg">
                {/* Field Selection */}
                <div className="flex-1">
                  <SelectField
                    label="Field"
                    value={condition.field}
                    onChange={(value) =>
                      updateCondition(index, { field: value, operator: "==", value: "" })
                    }
                    options={fieldOptions}
                    placeholder="Select field..."
                  />
                </div>

                {/* Operator Selection */}
                <div className="flex-1">
                  <SelectField
                    label="Operator"
                    value={condition.operator}
                    onChange={(value) => updateCondition(index, { operator: value })}
                    options={getOperatorOptions(index)}
                    disabled={!condition.field}
                  />
                </div>

                {/* Value Input */}
                <div className="flex-1">
                  <label className="label">
                    <span className="label-text">Value</span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered w-full"
                    placeholder={getPlaceholder(getFieldType(index), condition.operator)}
                    value={condition.value}
                    onChange={(e) => updateCondition(index, { value: e.target.value })}
                    disabled={!condition.field || !condition.operator}
                  />
                </div>

                {/* Remove Condition Button */}
                {conditions.length > 1 && (
                  <button className="btn btn-sm btn-error" onClick={() => removeCondition(index)}>
                    ×
                  </button>
                )}
              </div>

              {/* Logical Operator (show at the end of each condition except the last) */}
              {index < conditions.length - 1 && (
                <div className="flex justify-center items-center py-2">
                  <div className="flex items-center gap-2 bg-base-200 px-3 py-1 rounded">
                    <span className="text-sm font-medium">Next condition:</span>
                    <select
                      className="select select-bordered select-sm"
                      value={conditions[index + 1]?.logicalOperator || "and"}
                      onChange={(e) =>
                        updateCondition(index + 1, {
                          logicalOperator: e.target.value as "and" | "or",
                        })
                      }
                    >
                      <option value="and">AND</option>
                      <option value="or">OR</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Add Condition Button */}
        {conditions.length < MAX_CONDITIONS && (
          <div className="mt-4">
            <button className="btn btn-outline w-full" onClick={addCondition}>
              Add Condition
            </button>
          </div>
        )}

        <SyntaxPreview
          syntax={filterPreview}
          show={conditions.some((c) => c.field && c.operator && c.value !== "")}
        />

        {/* Action Buttons */}
        <div className="modal-action">
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleInsert}
            disabled={!conditions.some((c) => c.field && c.operator && c.value !== "")}
          >
            Insert Filter
          </button>
        </div>
      </div>
    </div>
  )
}
