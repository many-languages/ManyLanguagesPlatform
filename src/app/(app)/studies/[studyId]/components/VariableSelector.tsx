"use client"

import { useState } from "react"
import { EnrichedJatosStudyResult } from "@/src/types/jatos"
import FilterBuilder from "./FilterBuilder"

interface VariableSelectorProps {
  enrichedResult: EnrichedJatosStudyResult
  onInsert: (variableSyntax: string) => void
  markdown?: string
}

interface ExtractedVariable {
  variableName: string
  exampleValue: string
  type: "primitive" | "object" | "array"
  occurrences: number
  dataStructure: "array" | "object"
}

const MODIFIERS = [
  { key: "all", label: "All Values", description: "Show all occurrences" },
  { key: "first", label: "First Value", description: "Show only first occurrence" },
  { key: "last", label: "Last Value", description: "Show only last occurrence" },
]

export default function VariableSelector({
  enrichedResult,
  onInsert,
  markdown,
}: VariableSelectorProps) {
  const [selectedVariable, setSelectedVariable] = useState("")
  const [selectedModifier, setSelectedModifier] = useState("all")
  const [showFilterBuilder, setShowFilterBuilder] = useState(false)
  const [currentFilterClause, setCurrentFilterClause] = useState("")

  const variables = extractVariables(enrichedResult)

  const handleInsert = () => {
    let syntax = `{{ var:${selectedVariable}`
    if (selectedModifier !== "all") {
      syntax += `:${selectedModifier}`
    }
    syntax += " }}"

    if (currentFilterClause) {
      syntax = syntax.replace(" }}", `${currentFilterClause} }}`)
    }

    onInsert(syntax)
    // Clear selections after insert for next use
    setSelectedVariable("")
    setSelectedModifier("all")
    setCurrentFilterClause("")
  }

  const handleFilterInsert = (filterClause: string) => {
    setCurrentFilterClause(filterClause)
    setShowFilterBuilder(false)
  }

  return (
    <div className="dropdown dropdown-hover">
      <label tabIndex={0} className="btn btn-sm btn-outline m-1">
        Insert Variable ⌄
      </label>
      <div tabIndex={0} className="dropdown-content menu bg-base-200 rounded-box shadow p-4 w-80">
        <div className="space-y-3">
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
                if (newVariable) {
                  setSelectedModifier("all")
                }
              }}
            >
              <option value="">Select variable...</option>
              {variables.map((variable) => (
                <option key={variable.variableName} value={variable.variableName}>
                  {variable.variableName} ({variable.occurrences} occurrences)
                </option>
              ))}
            </select>
          </div>

          {selectedVariable && (
            <div>
              <label className="label">
                <span className="label-text">Value</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={selectedModifier}
                onChange={(e) => setSelectedModifier(e.target.value)}
              >
                {MODIFIERS.map((modifier) => (
                  <option key={modifier.key} value={modifier.key}>
                    {modifier.label} - {modifier.description}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Filter Button */}
          {selectedVariable && (
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
          {selectedVariable && (
            <div className="bg-base-100 p-2 rounded">
              <div className="text-sm font-medium">Preview:</div>
              <code className="text-sm">
                {(() => {
                  let syntax = `{{ var:${selectedVariable}`
                  if (selectedModifier !== "all") {
                    syntax += `:${selectedModifier}`
                  }
                  syntax += " }}"

                  if (currentFilterClause) {
                    syntax = syntax.replace(" }}", `${currentFilterClause} }}`)
                  }
                  return syntax
                })()}
              </code>
            </div>
          )}

          <button
            className="btn btn-primary btn-sm w-full"
            onClick={handleInsert}
            disabled={!selectedVariable}
          >
            Insert Variable
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
 * Extract variables from enriched JATOS result, handling both array and object data structures
 */
function extractVariables(enrichedResult: EnrichedJatosStudyResult): ExtractedVariable[] {
  const variableMap = new Map<string, ExtractedVariable>()

  // Excluded jsPsych metadata fields that researchers typically don't want in feedback
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
                variableName: key,
                exampleValue: formatExampleValue(value),
                type: getValueType(value),
                occurrences: 1,
                dataStructure: "array",
              })
            } else {
              const existing = variableMap.get(key)!
              existing.occurrences++
              // Update example value to show a more recent occurrence
              if (existing.occurrences <= 3) {
                existing.exampleValue = formatExampleValue(value)
              }
            }
          })
        }
      })
    } else if (typeof data === "object") {
      // SurveyJS-style: single object with responses
      Object.entries(data).forEach(([key, value]) => {
        if (excludedFields.has(key)) return

        variableMap.set(key, {
          variableName: key,
          exampleValue: formatExampleValue(value),
          type: getValueType(value),
          occurrences: 1,
          dataStructure: "object",
        })
      })
    }
  })

  return Array.from(variableMap.values()).sort((a, b) =>
    a.variableName.localeCompare(b.variableName)
  )
}

/**
 * Format example value for display, truncating long values
 */
function formatExampleValue(value: any): string {
  if (value === null || value === undefined) return "null"

  if (typeof value === "object") {
    const str = JSON.stringify(value)
    return str.length > 50 ? str.substring(0, 50) + "..." : str
  }

  const str = String(value)
  return str.length > 50 ? str.substring(0, 50) + "..." : str
}

/**
 * Determine the type of a value for categorization
 */
function getValueType(value: any): "primitive" | "object" | "array" {
  if (Array.isArray(value)) return "array"
  if (typeof value === "object" && value !== null) return "object"
  return "primitive"
}
