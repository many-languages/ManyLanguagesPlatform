"use client"

import { useState } from "react"
import { EnrichedJatosStudyResult } from "@/src/types/jatos"

interface FilterBuilderProps {
  enrichedResult: EnrichedJatosStudyResult
  onInsert: (filterClause: string) => void
  onClose: () => void
}

interface FilterCondition {
  field: string
  operator: string
  value: string
  logicalOperator?: "and" | "or"
}

const OPERATORS = {
  string: [
    { value: "==", label: "equals" },
    { value: "!=", label: "not equals" },
    { value: "in", label: "in list" },
  ],
  number: [
    { value: "==", label: "equals" },
    { value: "!=", label: "not equals" },
    { value: ">", label: "greater than" },
    { value: "<", label: "less than" },
    { value: ">=", label: "greater or equal" },
    { value: "<=", label: "less or equal" },
    { value: "in", label: "in list" },
  ],
  boolean: [
    { value: "==", label: "equals" },
    { value: "!=", label: "not equals" },
  ],
}

const MAX_CONDITIONS = 3

export default function FilterBuilder({ enrichedResult, onInsert, onClose }: FilterBuilderProps) {
  const [conditions, setConditions] = useState<FilterCondition[]>([
    { field: "", operator: "==", value: "" },
  ])

  const availableFields = extractAvailableFields(enrichedResult)

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

  const generateFilterClause = () => {
    const validConditions = conditions.filter((c) => c.field && c.operator && c.value !== "")
    if (validConditions.length === 0) return ""

    return validConditions
      .map((condition, index) => {
        const { field, operator, value, logicalOperator } = condition
        let conditionStr = ""

        if (operator === "in") {
          // Handle in operator with comma-separated values
          conditionStr = `${field} in [${value}]`
        } else {
          conditionStr = `${field} ${operator} ${value}`
        }

        // Add logical operator before condition (except for the first one)
        if (index > 0 && logicalOperator) {
          return `${logicalOperator} ${conditionStr}`
        }

        return conditionStr
      })
      .join(" ")
  }

  const handleInsert = () => {
    const filterClause = generateFilterClause()
    if (filterClause) {
      onInsert(` | where: ${filterClause}`)
      onClose()
    }
  }

  const selectedFieldType = (index: number) => {
    const field = conditions[index]?.field
    if (!field) return "string"
    const fieldInfo = availableFields.find((f) => f.name === field)
    return fieldInfo?.type || "string"
  }

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
                  <label className="label">
                    <span className="label-text">Field</span>
                  </label>
                  <select
                    className="select select-bordered w-full"
                    value={condition.field}
                    onChange={(e) => {
                      const newField = e.target.value
                      updateCondition(index, { field: newField, operator: "==", value: "" })
                    }}
                  >
                    <option value="">Select field...</option>
                    {availableFields.map((field) => (
                      <option key={field.name} value={field.name}>
                        {field.name} ({field.type})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Operator Selection */}
                <div className="flex-1">
                  <label className="label">
                    <span className="label-text">Operator</span>
                  </label>
                  <select
                    className="select select-bordered w-full"
                    value={condition.operator}
                    onChange={(e) => updateCondition(index, { operator: e.target.value })}
                  >
                    {OPERATORS[selectedFieldType(index) as keyof typeof OPERATORS].map((op) => (
                      <option key={op.value} value={op.value}>
                        {op.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Value Input */}
                <div className="flex-1">
                  <label className="label">
                    <span className="label-text">Value</span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered w-full"
                    placeholder={getPlaceholder(selectedFieldType(index), condition.operator)}
                    value={condition.value}
                    onChange={(e) => updateCondition(index, { value: e.target.value })}
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

        {/* Preview */}
        {conditions.some((c) => c.field && c.operator && c.value !== "") && (
          <div className="mt-4 p-3 bg-base-200 rounded">
            <div className="text-sm font-medium mb-2">Preview:</div>
            <code className="text-sm">{`| where: ${generateFilterClause()}`}</code>
          </div>
        )}

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

/**
 * Extract available fields for filtering
 */
function extractAvailableFields(
  enrichedResult: EnrichedJatosStudyResult
): Array<{ name: string; type: string }> {
  const fieldMap = new Map<string, string>()

  enrichedResult.componentResults.forEach((component) => {
    const data = component.parsedData ?? null
    if (!data) return

    if (Array.isArray(data)) {
      data.forEach((trial) => {
        if (typeof trial === "object" && trial !== null) {
          Object.entries(trial).forEach(([key, value]) => {
            fieldMap.set(key, getFieldType(value))
          })
        }
      })
    } else if (typeof data === "object") {
      Object.entries(data).forEach(([key, value]) => {
        fieldMap.set(key, getFieldType(value))
      })
    }
  })

  return Array.from(fieldMap.entries()).map(([name, type]) => ({ name, type }))
}

/**
 * Get field type for filtering
 */
function getFieldType(value: any): "string" | "number" | "boolean" {
  if (typeof value === "number") return "number"
  if (typeof value === "boolean") return "boolean"
  return "string"
}
