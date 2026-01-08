import { isPrimitive, isArrayOfPrimitives, isNestedArray } from "./typeGuards"

/**
 * Extraction Policy - decides what to emit vs what to recurse into
 *
 * Rules:
 * - Primitive → emit (return true)
 * - Array of primitives → recurse (return false) - emit each element individually with rowKey tracking
 * - Nested arrays (array containing arrays) → recurse (return false) - emit each element individually with rowKey tracking
 * - Objects → recurse only (return false)
 * - Arrays of objects → recurse only (return false)
 */
export function shouldEmit(value: any): boolean {
  // Primitives: always emit
  if (isPrimitive(value)) {
    return true
  }

  // Arrays: check what they contain
  if (Array.isArray(value)) {
    // Empty array: emit as-is
    if (value.length === 0) {
      return true
    }

    // Array of primitives: recurse to emit each element individually
    if (isArrayOfPrimitives(value)) {
      return false
    }

    // Nested arrays (array containing arrays): recurse to emit each element individually
    if (isNestedArray(value)) {
      return false
    }

    // Array of objects: recurse only (don't emit the array itself)
    return false
  }

  // Objects: recurse only (don't emit the object itself)
  if (typeof value === "object" && value !== null) {
    return false
  }

  // Unknown types (functions, symbols, undefined, etc. - not valid JSON): skip
  // These should not appear in valid JSON, but if they do, skip them
  return false
}
