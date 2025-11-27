import type { EnrichedJatosStudyResult } from "@/src/types/jatos"
import type { ExtractedVariable, AvailableVariable, AvailableField } from "../types"
import { extractNestedPaths, extractNestedPathsFromMultiple } from "./nestedStructureExtractor"

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

// Utility: Convert nested path type to ExtractedVariable type
function convertNestedPathTypeToExtractedType(
  nestedType: "string" | "number" | "boolean" | "object" | "array" | "null"
): "primitive" | "object" | "array" {
  if (nestedType === "array") return "array"
  if (nestedType === "object") return "object"
  return "primitive" // string, number, boolean, null all map to primitive
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

            // Check if value is an object or array that should be extracted
            const valueType = getValueType(value)
            if (
              valueType === "object" &&
              value !== null &&
              typeof value === "object" &&
              !Array.isArray(value)
            ) {
              // Extract nested paths from the object
              const nestedPaths = extractNestedPaths(value, key)

              nestedPaths.forEach((nestedPath) => {
                if (!variableMap.has(nestedPath.path)) {
                  const exampleValue =
                    nestedPath.exampleValue !== null && nestedPath.exampleValue !== undefined
                      ? formatExampleValue(nestedPath.exampleValue)
                      : "null"
                  variableMap.set(nestedPath.path, {
                    variableName: nestedPath.path,
                    exampleValue,
                    type: convertNestedPathTypeToExtractedType(nestedPath.type),
                    occurrences: 1,
                    dataStructure: "array",
                    allValues: [nestedPath.exampleValue],
                  })
                } else {
                  const existing = variableMap.get(nestedPath.path)!
                  existing.occurrences++
                  existing.allValues.push(nestedPath.exampleValue)
                  // Update example value if needed
                  if (
                    nestedPath.exampleValue !== null &&
                    nestedPath.exampleValue !== undefined &&
                    (existing.exampleValue === "null" || existing.occurrences <= 3)
                  ) {
                    existing.exampleValue = formatExampleValue(nestedPath.exampleValue)
                  }
                }
              })
            } else if (valueType === "array" && Array.isArray(value) && value.length > 0) {
              // For arrays, check if they contain objects - if so, extract nested paths
              const hasObjects = value.some(
                (item) => typeof item === "object" && item !== null && !Array.isArray(item)
              )

              if (hasObjects) {
                // Extract nested paths from array items
                const nestedPaths = extractNestedPathsFromMultiple(value, key)

                nestedPaths.forEach((nestedPath) => {
                  if (!variableMap.has(nestedPath.path)) {
                    const exampleValue =
                      nestedPath.exampleValue !== null && nestedPath.exampleValue !== undefined
                        ? formatExampleValue(nestedPath.exampleValue)
                        : "null"
                    variableMap.set(nestedPath.path, {
                      variableName: nestedPath.path,
                      exampleValue,
                      type: convertNestedPathTypeToExtractedType(nestedPath.type),
                      occurrences: 1,
                      dataStructure: "array",
                      allValues: [nestedPath.exampleValue],
                    })
                  } else {
                    const existing = variableMap.get(nestedPath.path)!
                    existing.occurrences++
                    existing.allValues.push(nestedPath.exampleValue)
                    // Update example value if needed
                    if (
                      nestedPath.exampleValue !== null &&
                      nestedPath.exampleValue !== undefined &&
                      (existing.exampleValue === "null" || existing.occurrences <= 3)
                    ) {
                      existing.exampleValue = formatExampleValue(nestedPath.exampleValue)
                    }
                  }
                })
              } else {
                // Array of primitives - handle as before
                if (!variableMap.has(key)) {
                  const exampleValue =
                    value !== null && value !== undefined ? formatExampleValue(value) : "null"
                  variableMap.set(key, {
                    variableName: key,
                    exampleValue,
                    type: "array",
                    occurrences: 1,
                    dataStructure: "array",
                    allValues: [value],
                  })
                } else {
                  const existing = variableMap.get(key)!
                  existing.occurrences++
                  existing.allValues.push(value)
                  if (
                    value !== null &&
                    value !== undefined &&
                    (existing.exampleValue === "null" || existing.occurrences <= 3)
                  ) {
                    existing.exampleValue = formatExampleValue(value)
                  }
                }
              }
            } else {
              // Primitive value - handle as before
              if (!variableMap.has(key)) {
                // Only set example value if it's not null or undefined
                const exampleValue =
                  value !== null && value !== undefined ? formatExampleValue(value) : "null"
                variableMap.set(key, {
                  variableName: key,
                  exampleValue,
                  type: getValueType(value),
                  occurrences: 1,
                  dataStructure: "array",
                  allValues: [value], // Store all values
                })
              } else {
                const existing = variableMap.get(key)!
                existing.occurrences++
                existing.allValues.push(value) // Add value to array
                // Update example value if:
                // 1. Current example is "null" and we found a non-null value, OR
                // 2. Occurrences <= 3 and we found a non-null value
                if (
                  value !== null &&
                  value !== undefined &&
                  (existing.exampleValue === "null" || existing.occurrences <= 3)
                ) {
                  existing.exampleValue = formatExampleValue(value)
                }
              }
            }
          })
        }
      })
    } else if (typeof data === "object") {
      // SurveyJS-style: single object with responses
      Object.entries(data).forEach(([key, value]) => {
        if (EXCLUDED_FIELDS.has(key)) return

        const valueType = getValueType(value)

        // If value is an object or array, extract nested paths
        if (
          valueType === "object" &&
          value !== null &&
          typeof value === "object" &&
          !Array.isArray(value)
        ) {
          // Extract nested paths from the object
          const nestedPaths = extractNestedPaths(value, key)

          nestedPaths.forEach((nestedPath) => {
            if (!variableMap.has(nestedPath.path)) {
              const exampleValue =
                nestedPath.exampleValue !== null && nestedPath.exampleValue !== undefined
                  ? formatExampleValue(nestedPath.exampleValue)
                  : "null"
              variableMap.set(nestedPath.path, {
                variableName: nestedPath.path,
                exampleValue,
                type:
                  nestedPath.type === "null"
                    ? "primitive"
                    : nestedPath.type === "array"
                    ? "array"
                    : nestedPath.type === "object"
                    ? "object"
                    : "primitive",
                occurrences: 1,
                dataStructure: "object",
                allValues: [nestedPath.exampleValue],
              })
            }
          })
        } else if (valueType === "array" && Array.isArray(value) && value.length > 0) {
          // For arrays, check if they contain objects
          const hasObjects = value.some(
            (item) => typeof item === "object" && item !== null && !Array.isArray(item)
          )

          if (hasObjects) {
            // Extract nested paths from array items
            const nestedPaths = extractNestedPathsFromMultiple(value, key)

            nestedPaths.forEach((nestedPath) => {
              if (!variableMap.has(nestedPath.path)) {
                const exampleValue =
                  nestedPath.exampleValue !== null && nestedPath.exampleValue !== undefined
                    ? formatExampleValue(nestedPath.exampleValue)
                    : "null"
                variableMap.set(nestedPath.path, {
                  variableName: nestedPath.path,
                  exampleValue,
                  type:
                    nestedPath.type === "null"
                      ? "primitive"
                      : nestedPath.type === "array"
                      ? "array"
                      : nestedPath.type === "object"
                      ? "object"
                      : "primitive",
                  occurrences: 1,
                  dataStructure: "object",
                  allValues: [nestedPath.exampleValue],
                })
              }
            })
          } else {
            // Array of primitives - store as is
            const exampleValue =
              value !== null && value !== undefined ? formatExampleValue(value) : "null"
            variableMap.set(key, {
              variableName: key,
              exampleValue,
              type: "array",
              occurrences: 1,
              dataStructure: "object",
              allValues: [value],
            })
          }
        } else {
          // Primitive value - store as is
          const exampleValue =
            value !== null && value !== undefined ? formatExampleValue(value) : "null"
          variableMap.set(key, {
            variableName: key,
            exampleValue,
            type: getValueType(value),
            occurrences: 1,
            dataStructure: "object",
            allValues: [value],
          })
        }
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
