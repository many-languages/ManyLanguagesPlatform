import { TYPE_BADGE_CLASSES } from "../constants"
import type { VariableType } from "../../variables/types"

/**
 * Maps a variable type to its corresponding badge class
 * @param type - The variable type from variables/types.ts
 * @returns The DaisyUI badge class name
 */
export function getTypeBadgeClass(type: VariableType): string {
  // Map string/number/boolean to primitive, keep array/object as is
  if (type === "string" || type === "number" || type === "boolean") {
    return TYPE_BADGE_CLASSES.primitive
  }
  if (type === "array") {
    return TYPE_BADGE_CLASSES.array
  }
  return TYPE_BADGE_CLASSES.object
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
