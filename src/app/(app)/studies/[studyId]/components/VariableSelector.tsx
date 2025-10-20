"use client"

import { EnrichedJatosStudyResult } from "@/src/types/jatos"

interface VariableSelectorProps {
  enrichedResult: EnrichedJatosStudyResult
  onInsert: (variableName: string) => void
}

interface ExtractedVariable {
  variableName: string
  exampleValue: string
  type: "primitive" | "object" | "array"
  occurrences: number
  dataStructure: "array" | "object"
}

/**
 * Dropdown that lists all variable names detected in the enriched JATOS result,
 * with example values. Selecting one inserts it as a placeholder.
 *
 * Handles both:
 * - jsPsych-style data: Array of trial objects with repeated fields
 * - SurveyJS-style data: Single object with unique field names
 *
 * Future: Will support computed variables with aggregation functions
 */
export default function VariableSelector({ enrichedResult, onInsert }: VariableSelectorProps) {
  const variables = extractVariables(enrichedResult)

  return (
    <div className="dropdown dropdown-hover">
      <label tabIndex={0} className="btn btn-sm btn-outline m-1">
        Insert Variable ⌄
      </label>
      <ul
        tabIndex={0}
        className="dropdown-content menu bg-base-200 rounded-box shadow p-2 w-64 max-h-96 overflow-y-auto"
      >
        {variables.length === 0 && (
          <li className="text-sm opacity-70 px-2 py-1">No variables available</li>
        )}

        {variables.map((v, i) => (
          <li
            key={`${v.variableName}-${i}`}
            onClick={() => onInsert(v.variableName)}
            className="hover:bg-base-300 rounded-md cursor-pointer px-2 py-1 flex justify-between"
          >
            <div className="flex flex-col">
              <span className="font-semibold">{v.variableName}</span>
              {v.occurrences > 1 && (
                <span className="text-xs opacity-60">{v.occurrences} occurrences</span>
              )}
            </div>
            <span className="opacity-50 text-xs truncate max-w-[100px]">{v.exampleValue}</span>
          </li>
        ))}
      </ul>
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
