/**
 * Shared Array Pattern Detection Utilities
 * Used by both structure analyzer and variable extraction
 */

export interface ArrayContentAnalysis {
  hasObjects: boolean
  hasPrimitives: boolean
  hasNestedArrays: boolean
  isMixedWithObjects: boolean // Objects + primitives
  isMixedWithArrays: boolean // Nested arrays + primitives
  isArrayOfArrays: boolean // Only nested arrays
  isArrayOfObjects: boolean // Only objects
  isArrayOfPrimitives: boolean // Only primitives
}

/**
 * Analyze the content types within an array
 */
export function analyzeArrayContent(value: any[]): ArrayContentAnalysis {
  const hasObjects = value.some(
    (item) => typeof item === "object" && item !== null && !Array.isArray(item)
  )
  const hasPrimitives = value.some((item) => typeof item !== "object" || item === null)
  const hasNestedArrays = value.some(Array.isArray)

  const isMixedWithObjects = hasObjects && hasPrimitives
  const isMixedWithArrays = hasNestedArrays && hasPrimitives
  const isArrayOfArrays = hasNestedArrays && !hasObjects && !hasPrimitives
  const isArrayOfObjects = hasObjects && !hasPrimitives && !hasNestedArrays
  const isArrayOfPrimitives = hasPrimitives && !hasObjects && !hasNestedArrays

  return {
    hasObjects,
    hasPrimitives,
    hasNestedArrays,
    isMixedWithObjects,
    isMixedWithArrays,
    isArrayOfArrays,
    isArrayOfObjects,
    isArrayOfPrimitives,
  }
}

/**
 * Check if an array structure will likely cause extraction issues
 */
export interface ExtractionIssuePrediction {
  willHaveIssues: boolean
  issues: Array<{
    type: "mixed_array" | "nested_arrays" | "varied_structure"
    severity: "warning" | "error"
    message: string
  }>
}

export function predictExtractionIssues(
  value: any[],
  path: string = ""
): ExtractionIssuePrediction {
  const analysis = analyzeArrayContent(value)
  const issues: ExtractionIssuePrediction["issues"] = []

  if (analysis.isMixedWithObjects) {
    issues.push({
      type: "mixed_array",
      severity: "error",
      message: `Mixed array '${path}' contains both objects and primitives. Primitives will be skipped during extraction.`,
    })
  }

  if (analysis.isMixedWithArrays) {
    issues.push({
      type: "nested_arrays",
      severity: "warning",
      message: `Array '${path}' contains nested arrays mixed with primitives. Nested arrays will be returned as-is.`,
    })
  }

  if (analysis.isArrayOfArrays) {
    issues.push({
      type: "nested_arrays",
      severity: "warning",
      message: `Array '${path}' contains only nested arrays. All content will be returned as-is without extraction.`,
    })
  }

  // Check for varied structure in array of objects
  if (analysis.isArrayOfObjects && value.length > 1) {
    const firstItemKeys = new Set(
      typeof value[0] === "object" && value[0] !== null ? Object.keys(value[0]) : []
    )

    const allHaveSameKeys = value.every((item) => {
      if (typeof item !== "object" || item === null) return false
      const itemKeys = new Set(Object.keys(item))
      return (
        itemKeys.size === firstItemKeys.size &&
        Array.from(firstItemKeys).every((key) => itemKeys.has(key))
      )
    })

    if (!allHaveSameKeys) {
      issues.push({
        type: "varied_structure",
        severity: "warning",
        message: `Array '${path}' contains objects with inconsistent keys. Some variables may be missing in some occurrences.`,
      })
    }
  }

  return {
    willHaveIssues: issues.length > 0,
    issues,
  }
}
