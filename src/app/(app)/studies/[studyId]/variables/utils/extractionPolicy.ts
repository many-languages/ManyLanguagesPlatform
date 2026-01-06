import { isPrimitive, isArrayOfPrimitives, isNestedArray } from "./typeGuards"

/**
 * Extraction Policy - decides what to emit vs what to recurse into
 *
 * Rules:
 * - Primitive → emit (return true)
 * - Array of primitives → emit (return true)
 * - Nested arrays (array containing arrays) → emit as-is (return true)
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

    // Array of primitives: emit
    if (isArrayOfPrimitives(value)) {
      return true
    }

    // Nested arrays (array containing arrays): emit as-is
    if (isNestedArray(value)) {
      return true
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
