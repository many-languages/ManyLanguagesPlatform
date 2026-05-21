"use client"

import { useEffect, useMemo, useState } from "react"
import Modal from "@/src/components/ui/Modal"
import { SelectField, SyntaxPreview } from "./shared"
import type { FeedbackVariable } from "@/src/features/feedback/types"
import { getFilterOperators } from "@/src/features/feedback/domain/feedbackDslOperators"
import {
  buildFilterClause,
  type FilterCondition,
} from "@/src/features/feedback/domain/buildFeedbackDslExpression"

interface FilterBuilderProps {
  open: boolean
  variables: FeedbackVariable[]
  onInsert: (filterClause: string) => void
  onClose: () => void
}

const MAX_CONDITIONS = 3
const INITIAL_CONDITION: FilterCondition = { field: "", operator: "==", value: "" }

export default function FilterBuilder({ open, variables, onInsert, onClose }: FilterBuilderProps) {
  const [conditions, setConditions] = useState<FilterCondition[]>([INITIAL_CONDITION])

  useEffect(() => {
    if (!open) {
      setConditions([INITIAL_CONDITION])
    }
  }, [open])

  const fieldOptions = useMemo(
    () =>
      variables.map((v) => ({
        value: v.dslKey ?? v.variableName,
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
    return variables.find((v) => (v.dslKey ?? v.variableName) === field)?.type ?? "string"
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

  const canInsert = conditions.some((c) => c.field && c.operator && c.value !== "")

  return (
    <Modal open={open} size="max-w-2xl">
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold">Add Filter Conditions</h3>
          <button className="btn btn-sm btn-circle btn-ghost" onClick={onClose} type="button">
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {conditions.map((condition, index) => (
            <div key={index}>
              <div className="flex items-end gap-2 p-4 bg-base-100 rounded-lg">
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

                <div className="flex-1">
                  <SelectField
                    label="Operator"
                    value={condition.operator}
                    onChange={(value) => updateCondition(index, { operator: value })}
                    options={getOperatorOptions(index)}
                    disabled={!condition.field}
                  />
                </div>

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

                {conditions.length > 1 && (
                  <button
                    className="btn btn-sm btn-error"
                    onClick={() => removeCondition(index)}
                    type="button"
                  >
                    ×
                  </button>
                )}
              </div>

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

        {conditions.length < MAX_CONDITIONS && (
          <button className="btn btn-outline w-full" onClick={addCondition} type="button">
            Add Condition
          </button>
        )}

        <SyntaxPreview syntax={filterPreview} show={canInsert} />

        <div className="flex justify-end gap-2">
          <button className="btn btn-ghost" onClick={onClose} type="button">
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleInsert}
            disabled={!canInsert}
            type="button"
          >
            Insert Filter
          </button>
        </div>
      </div>
    </Modal>
  )
}
