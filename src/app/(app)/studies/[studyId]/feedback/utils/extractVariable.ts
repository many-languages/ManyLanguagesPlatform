import type { EnrichedJatosStudyResult } from "@/src/types/jatos"
import type { ExtractedVariable, AvailableVariable, AvailableField } from "../types"

// Constants
export const EXCLUDED_FIELDS = new Set([
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

// Utility: Get field type
export function getFieldType(value: any): "string" | "number" | "boolean" {
  if (typeof value === "number") return "number"
  if (typeof value === "boolean") return "boolean"
  return "string"
}

// Utility: Get value type for categorization
export function getValueType(value: any): "primitive" | "object" | "array" {
  if (Array.isArray(value)) return "array"
  if (typeof value === "object" && value !== null) return "object"
  return "primitive"
}

// Utility: Format example value for display
export function formatExampleValue(value: any): string {
  if (value === null || value === undefined) return "null"

  if (typeof value === "object") {
    const str = JSON.stringify(value)
    return str.length > 50 ? str.substring(0, 50) + "..." : str
  }

  const str = String(value)
  return str.length > 50 ? str.substring(0, 50) + "..." : str
}

/**
 * Extract variables from enriched JATOS result with full metadata
 * Used by VariableSelector component
 */
export function extractVariables(enrichedResult: EnrichedJatosStudyResult): ExtractedVariable[] {
  const variableMap = new Map<string, ExtractedVariable>()

  enrichedResult.componentResults.forEach((component) => {
    const data = component.parsedData ?? null
    if (!data) return

    if (Array.isArray(data)) {
      // jsPsych-style: array of trial objects
      data.forEach((trial) => {
        if (typeof trial === "object" && trial !== null) {
          Object.entries(trial).forEach(([key, value]) => {
            if (EXCLUDED_FIELDS.has(key)) return

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
        if (EXCLUDED_FIELDS.has(key)) return

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
 * Extract all variables from enriched JATOS result
 * Used by StatsSelector component
 */
export function extractAllVariables(enrichedResult: EnrichedJatosStudyResult): AvailableVariable[] {
  const variableMap = new Map<string, AvailableVariable>()

  enrichedResult.componentResults.forEach((component) => {
    const data = component.parsedData ?? null
    if (!data) return

    if (Array.isArray(data)) {
      // jsPsych-style: array of trial objects
      data.forEach((trial) => {
        if (typeof trial === "object" && trial !== null) {
          Object.entries(trial).forEach(([key, value]) => {
            if (EXCLUDED_FIELDS.has(key)) return

            if (!variableMap.has(key)) {
              variableMap.set(key, {
                name: key,
                type: getFieldType(value),
                example: value,
              })
            }
          })
        }
      })
    } else if (typeof data === "object") {
      // SurveyJS-style: single object with responses
      Object.entries(data).forEach(([key, value]) => {
        if (EXCLUDED_FIELDS.has(key)) return

        variableMap.set(key, {
          name: key,
          type: getFieldType(value),
          example: value,
        })
      })
    }
  })

  return Array.from(variableMap.values()).sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Extract available fields from enriched result
 * Used by FilterBuilder, ConditionalBuilder, and dslValidator
 */
export function extractAvailableFields(
  enrichedResult: EnrichedJatosStudyResult,
  options?: {
    includeExcluded?: boolean
    includeExample?: boolean
  }
): AvailableField[] {
  const { includeExcluded = false, includeExample = false } = options || {}
  const fieldMap = new Map<string, AvailableField>()

  enrichedResult.componentResults.forEach((component) => {
    const data = component.parsedData ?? null
    if (!data) return

    if (Array.isArray(data)) {
      data.forEach((trial) => {
        if (typeof trial === "object" && trial !== null) {
          Object.entries(trial).forEach(([key, value]) => {
            if (!includeExcluded && EXCLUDED_FIELDS.has(key)) return

            if (!fieldMap.has(key)) {
              fieldMap.set(key, {
                name: key,
                type: getFieldType(value),
                ...(includeExample && { example: value }),
              })
            }
          })
        }
      })
    } else if (typeof data === "object") {
      Object.entries(data).forEach(([key, value]) => {
        if (!includeExcluded && EXCLUDED_FIELDS.has(key)) return

        fieldMap.set(key, {
          name: key,
          type: getFieldType(value),
          ...(includeExample && { example: value }),
        })
      })
    }
  })

  return Array.from(fieldMap.values()).sort((a, b) => a.name.localeCompare(b.name))
}
