import type { EnrichedJatosStudyResult } from "@/src/types/jatos"
import type { ExtractedVariable, AvailableVariable, SkippedValue, ExtractionResult } from "../types"
import { analyzeArrayContent } from "./arrayPatternDetection"

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
 * Extract variables from CSV data - treat columns as variables
 */
function extractFromCsv(
  parsedData: any[],
  dataStructure: "array" | "object",
  componentId: number
): {
  variables: Map<string, ExtractedVariable>
  skippedValues: SkippedValue[]
  warnings: string[]
} {
  const variableMap = new Map<string, ExtractedVariable>()
  const skippedValues: SkippedValue[] = []
  const warnings: string[] = []

  if (!Array.isArray(parsedData) || parsedData.length === 0) {
    warnings.push("CSV data is empty or invalid")
    return { variables: variableMap, skippedValues, warnings }
  }

  // Get column names from first row
  const firstRow = parsedData[0]
  if (typeof firstRow !== "object" || firstRow === null) {
    warnings.push("CSV first row is not an object - cannot extract column variables")
    return { variables: variableMap, skippedValues, warnings }
  }

  const columnNames = Object.keys(firstRow)

  if (columnNames.length === 0) {
    warnings.push("CSV has no columns")
    return { variables: variableMap, skippedValues, warnings }
  }

  // Extract each column as a variable
  columnNames.forEach((columnName) => {
    const columnValues: any[] = []
    parsedData.forEach((row) => {
      if (row && typeof row === "object" && columnName in row) {
        columnValues.push(row[columnName])
      }
    })

    // Find first non-null, non-undefined value for example
    const exampleValue = columnValues.find((v) => v !== null && v !== undefined)

    // Determine variable type
    const hasObjects = columnValues.some(
      (v) => v !== null && typeof v === "object" && !Array.isArray(v)
    )
    const hasArrays = columnValues.some(Array.isArray)
    const hasPrimitives = columnValues.some(
      (v) => v === null || v === undefined || (typeof v !== "object" && !Array.isArray(v))
    )

    let variableType: "primitive" | "object" | "array"
    if (hasArrays) {
      variableType = "array"
    } else if (hasObjects) {
      variableType = "object"
    } else {
      variableType = "primitive"
    }

    variableMap.set(columnName, {
      variableName: columnName,
      exampleValue: exampleValue !== undefined ? formatExampleValue(exampleValue) : "null",
      type: variableType,
      occurrences: columnValues.length,
      dataStructure,
      allValues: columnValues,
      componentIds: [componentId],
    })
  })

  return { variables: variableMap, skippedValues, warnings }
}

/**
 * Unified recursive extraction for JSON data
 * Arrays are containers, objects are deconstructed, primitives are extracted if named
 */
function extractFromJsonRecursive(
  value: any,
  basePath: string = "",
  variableMap: Map<string, ExtractedVariable>,
  skippedValues: SkippedValue[],
  warnings: string[],
  dataStructure: "array" | "object",
  maxDepth: number = 20,
  componentId: number
): void {
  if (maxDepth <= 0) return

  if (Array.isArray(value)) {
    if (basePath) {
      // Named array - extract the array itself as a variable
      if (!variableMap.has(basePath)) {
        variableMap.set(basePath, {
          variableName: basePath,
          exampleValue: formatExampleValue(value),
          type: "array",
          occurrences: 1,
          dataStructure,
          allValues: [value],
          componentIds: [componentId],
        })
      } else {
        const existing = variableMap.get(basePath)!
        existing.occurrences++
        existing.allValues.push(value)
      }

      // Check array content types using shared utility
      const arrayAnalysis = analyzeArrayContent(value)
      const { hasObjects, isMixedWithObjects, isMixedWithArrays, isArrayOfArrays } = arrayAnalysis

      // Add warnings for problematic but non-fatal array structures
      if (isMixedWithArrays) {
        // Mixed array with primitives and nested arrays - WARNING (don't skip)
        warnings.push(
          `Mixed array '${basePath}' contains both primitives and nested arrays - all content returned as-is`
        )
      } else if (isArrayOfArrays) {
        // Array of arrays - WARNING (don't skip)
        warnings.push(`Array '${basePath}' contains nested arrays - all content returned as-is`)
      }

      if (hasObjects) {
        // Array contains objects - recurse into them to extract nested structures
        value.forEach((item) => {
          if (typeof item === "object" && item !== null && !Array.isArray(item)) {
            // Object in array - recurse with wildcard notation
            extractFromJsonRecursive(
              item,
              `${basePath}[*]`,
              variableMap,
              skippedValues,
              warnings,
              dataStructure,
              maxDepth - 1,
              componentId
            )
          } else if (isMixedWithObjects && (typeof item !== "object" || item === null)) {
            // Primitive in mixed array (array has both objects and primitives) - ERROR: skip as faulty
            skippedValues.push({
              value: item,
              path: basePath,
              reason: "primitive_in_mixed_array",
              severity: "error",
              context: `Primitive value in mixed array '${basePath}' - array contains both objects and primitives, primitives cannot be cleanly extracted`,
            })
          } else if (Array.isArray(item) && isMixedWithObjects) {
            // Nested array in mixed array with objects - ERROR: skip as faulty
            skippedValues.push({
              value: item,
              path: basePath,
              reason: "mixed_array_with_nested_arrays",
              severity: "error",
              context: `Nested array in mixed array '${basePath}' - array contains both objects and nested arrays, nested arrays cannot be cleanly extracted`,
            })
          }
        })
      }
      // If array only contains primitives/nested arrays (not mixed), no recursion needed - array is the variable
    } else {
      // Root-level array - collect all unique keys from all objects first
      if (
        value.length > 0 &&
        typeof value[0] === "object" &&
        value[0] !== null &&
        !Array.isArray(value[0])
      ) {
        // Array of objects - collect all unique keys across all objects
        const allKeys = new Set<string>()
        value.forEach((item) => {
          if (typeof item === "object" && item !== null && !Array.isArray(item)) {
            Object.keys(item).forEach((key) => {
              allKeys.add(key)
            })
          }
        })

        // Extract each key as a variable with all its values
        allKeys.forEach((key) => {
          const keyValues: any[] = []
          value.forEach((item) => {
            if (typeof item === "object" && item !== null && !Array.isArray(item) && key in item) {
              keyValues.push(item[key])
            }
          })

          if (keyValues.length > 0) {
            const exampleValue = keyValues.find((v) => v !== null && v !== undefined)
            const variableType = getValueType(exampleValue !== undefined ? exampleValue : null)

            const existing = variableMap.get(key)
            if (!existing) {
              variableMap.set(key, {
                variableName: key,
                exampleValue:
                  exampleValue !== undefined ? formatExampleValue(exampleValue) : "null",
                type: variableType,
                occurrences: keyValues.length,
                dataStructure,
                allValues: keyValues,
                componentIds: [componentId],
              })
            } else {
              existing.occurrences += keyValues.length
              existing.allValues.push(...keyValues)
              // Update example value if needed
              if (
                exampleValue !== undefined &&
                exampleValue !== null &&
                (existing.exampleValue === "null" || existing.occurrences <= 3)
              ) {
                existing.exampleValue = formatExampleValue(exampleValue)
              }
            }
          }
        })
      } else {
        // Array of primitives or other types - process normally
        value.forEach((item) => {
          if (typeof item === "object" && item !== null && !Array.isArray(item)) {
            // Object - recurse
            extractFromJsonRecursive(
              item,
              "",
              variableMap,
              skippedValues,
              warnings,
              dataStructure,
              maxDepth - 1,
              componentId
            )
          } else {
            // Unnamed primitive or nested array - skip but record
            skippedValues.push({
              value: item,
              path: "",
              reason: "unnamed_primitive_in_root_array",
              severity: "error",
              context:
                "Unnamed value at root level in array - cannot extract as variable without a key",
            })
          }
        })
      }
    }
  } else if (typeof value === "object" && value !== null) {
    // Object - deconstruct recursively
    Object.entries(value).forEach(([key, val]) => {
      const newPath = basePath ? `${basePath}.${key}` : key
      extractFromJsonRecursive(
        val,
        newPath,
        variableMap,
        skippedValues,
        warnings,
        dataStructure,
        maxDepth - 1,
        componentId
      )
    })
  } else {
    // Primitive
    if (basePath) {
      // Named primitive - extract as variable
      const existing = variableMap.get(basePath)
      if (!existing) {
        variableMap.set(basePath, {
          variableName: basePath,
          exampleValue: formatExampleValue(value),
          type: getValueType(value),
          occurrences: 1,
          dataStructure,
          allValues: [value],
          componentIds: [componentId],
        })
      } else {
        existing.occurrences++
        existing.allValues.push(value)
        // Update example value if needed
        if (
          value !== null &&
          value !== undefined &&
          (existing.exampleValue === "null" || existing.occurrences <= 3)
        ) {
          existing.exampleValue = formatExampleValue(value)
        }
      }
    } else {
      // Root-level primitive without key - skip but record
      skippedValues.push({
        value: value,
        path: "",
        reason: "unnamed_primitive_at_root",
        severity: "error",
        context: "Unnamed primitive at root level - cannot extract as variable without a key",
      })
    }
  }
}

/**
 * Extract variables from a single component based on format
 */
function extractFromComponent(
  component: {
    parsedData?: any
    detectedFormat?: { format: string }
    parseError?: string
    dataContent?: string | null
  },
  componentId: number
): ExtractionResult {
  const variableMap = new Map<string, ExtractedVariable>()
  const skippedValues: SkippedValue[] = []
  const warnings: string[] = []

  // Check for parse errors
  if (component.parseError) {
    warnings.push(`Parse error: ${component.parseError}`)
    skippedValues.push({
      value: component.dataContent || null,
      path: "",
      reason: "parse_error",
      severity: "error",
      context: `Failed to parse data: ${component.parseError}`,
    })
    return { variables: [], skippedValues, warnings }
  }

  const format = component.detectedFormat?.format
  const parsedData = component.parsedData

  // Route based on format
  if (format === "csv" || format === "tsv") {
    // CSV/TSV: Extract columns as variables
    if (Array.isArray(parsedData)) {
      const result = extractFromCsv(parsedData, "array", componentId)
      result.variables.forEach((variable, key) => {
        // Merge with existing variables from other components
        const existing = variableMap.get(key)
        if (existing) {
          existing.occurrences += variable.occurrences
          existing.allValues.push(...variable.allValues)
        } else {
          variableMap.set(key, variable)
        }
      })
      skippedValues.push(...result.skippedValues)
      warnings.push(...result.warnings)
    } else {
      warnings.push("CSV/TSV data is not an array after parsing")
    }
  } else if (format === "json") {
    // JSON: Use unified recursive extraction
    if (parsedData !== undefined && parsedData !== null) {
      const dataStructure: "array" | "object" = Array.isArray(parsedData) ? "array" : "object"
      extractFromJsonRecursive(
        parsedData,
        "",
        variableMap,
        skippedValues,
        warnings,
        dataStructure,
        20,
        componentId
      )
    } else {
      warnings.push("JSON data is null or undefined")
    }
  } else if (format === "text") {
    // Text: Cannot process, return as-is with warning
    warnings.push(
      "Text format data cannot be processed for variable extraction - data is unstructured"
    )
    skippedValues.push({
      value: component.dataContent || null,
      path: "",
      reason: "text_format_not_supported",
      severity: "error",
      context: "Text format data is not structured and cannot be extracted as variables",
    })
  } else {
    warnings.push(`Unknown format: ${format || "undefined"}`)
  }

  return {
    variables: Array.from(variableMap.values()).sort((a, b) =>
      a.variableName.localeCompare(b.variableName)
    ),
    skippedValues,
    warnings,
  }
}

/**
 * Extract variables from enriched JATOS result with full details
 * Uses unified recursive strategy based on data format
 * Returns variables, skipped values, and warnings
 */
export function extractVariables(enrichedResult: EnrichedJatosStudyResult): ExtractionResult {
  const allVariables = new Map<string, ExtractedVariable>()
  const allSkippedValues: SkippedValue[] = []
  const allWarnings: string[] = []

  enrichedResult.componentResults.forEach((component) => {
    if (!component.parsedData && !component.dataContent) return

    const componentResult = extractFromComponent(component, component.componentId)

    // Merge variables from this component
    componentResult.variables.forEach((variable) => {
      const existing = allVariables.get(variable.variableName)
      if (existing) {
        existing.occurrences += variable.occurrences
        existing.allValues.push(...variable.allValues)
        // Merge componentIds
        if (!existing.componentIds.includes(component.componentId)) {
          existing.componentIds.push(component.componentId)
        }
        // Update example value if needed
        if (
          variable.exampleValue !== "null" &&
          (existing.exampleValue === "null" || existing.occurrences <= 3)
        ) {
          existing.exampleValue = variable.exampleValue
        }
      } else {
        allVariables.set(variable.variableName, { ...variable })
      }
    })

    // Collect skipped values and warnings
    allSkippedValues.push(...componentResult.skippedValues)
    allWarnings.push(...componentResult.warnings)
  })

  return {
    variables: Array.from(allVariables.values()).sort((a, b) =>
      a.variableName.localeCompare(b.variableName)
    ),
    skippedValues: allSkippedValues,
    warnings: allWarnings,
  }
}

/**
 * Extract available variables from enriched JATOS result
 * Used by StatsSelector, FilterBuilder, ConditionalBuilder, and dslValidator
 */
export function extractAvailableVariables(
  enrichedResult: EnrichedJatosStudyResult,
  options?: {
    includeExample?: boolean
  }
): AvailableVariable[] {
  const { includeExample = false } = options || {}
  const variableMap = new Map<string, AvailableVariable>()

  enrichedResult.componentResults.forEach((component) => {
    const data = component.parsedData ?? null
    if (!data) return

    if (Array.isArray(data)) {
      // jsPsych-style: array of trial objects
      data.forEach((trial) => {
        if (typeof trial === "object" && trial !== null) {
          Object.entries(trial).forEach(([key, value]) => {
            if (!variableMap.has(key)) {
              variableMap.set(key, {
                name: key,
                type: getFieldType(value),
                ...(includeExample && { example: value }),
              })
            }
          })
        }
      })
    } else if (typeof data === "object") {
      // SurveyJS-style: single object with responses
      Object.entries(data).forEach(([key, value]) => {
        variableMap.set(key, {
          name: key,
          type: getFieldType(value),
          ...(includeExample && { example: value }),
        })
      })
    }
  })

  return Array.from(variableMap.values()).sort((a, b) => a.name.localeCompare(b.name))
}
