import { TYPE_BADGE_CLASSES, VariableType } from "../constants"

/**
 * Maps a variable type to its corresponding badge class
 * @param type - The variable type (primitive, array, or object)
 * @returns The DaisyUI badge class name
 */
export function getTypeBadgeClass(type: VariableType | "primitive" | "array" | "object"): string {
  // Normalize the type to match our constants
  const normalizedType: VariableType =
    type === "primitive" ? "primitive" : type === "array" ? "array" : "object"

  return TYPE_BADGE_CLASSES[normalizedType]
}

/**
 * Maps a path type (from structure analysis) to badge class
 * Handles string, number, boolean, null, array, object types
 */
export function getPathTypeBadgeClass(
  type: "string" | "number" | "boolean" | "null" | "array" | "object" | "primitive"
): string {
  if (
    type === "string" ||
    type === "number" ||
    type === "boolean" ||
    type === "null" ||
    type === "primitive"
  ) {
    return TYPE_BADGE_CLASSES.primitive
  }
  if (type === "array") {
    return TYPE_BADGE_CLASSES.array
  }
  return TYPE_BADGE_CLASSES.object
}
