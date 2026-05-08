import type { ValueType } from "../types"

/**
 * Centralized type checking utilities for variable extraction
 */

/**
 * Get the value type for a given value
 */
export function getValueType(value: any): ValueType {
  if (value === null) return "null"
  if (typeof value === "boolean") return "boolean"
  if (typeof value === "number") return "number"
  if (typeof value === "string") return "string"
  if (Array.isArray(value)) return "array"
  if (typeof value === "object") return "object"
  // Fallback for undefined or other edge cases
  return "null"
}

/**
 * Check if a value is a primitive (null, boolean, number, string)
 */
export function isPrimitive(value: any): boolean {
  return (
    value === null ||
    value === undefined ||
    typeof value === "boolean" ||
    typeof value === "number" ||
    typeof value === "string"
  )
}

/**
 * Check if an array contains only primitive values
 */
export function isArrayOfPrimitives(value: any[]): boolean {
  if (!Array.isArray(value)) return false
  if (value.length === 0) return true // Empty array is considered array of primitives
  return value.every((item) => isPrimitive(item))
}

/**
 * Check if an array contains nested arrays (array of arrays)
 */
export function isNestedArray(value: any[]): boolean {
  if (!Array.isArray(value)) return false
  return value.some((item) => Array.isArray(item))
}
