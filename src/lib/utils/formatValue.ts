/**
 * Formats a value for display in UI
 * Handles null, undefined, objects, and primitives
 * @param value - The value to format
 * @returns Formatted string representation
 */
export function formatValue(value: any): string {
  if (value === null) return "null"
  if (value === undefined) return "undefined"

  if (typeof value === "object") {
    try {
      return JSON.stringify(value, null, 2)
    } catch {
      return String(value)
    }
  }

  return String(value)
}
