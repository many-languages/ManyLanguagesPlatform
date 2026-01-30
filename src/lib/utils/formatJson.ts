/**
 * Formats a value as pretty-printed JSON string
 * @param value - The value to format as JSON
 * @param indent - Number of spaces for indentation (default: 2)
 * @returns Formatted JSON string, or fallback string if serialization fails
 */
export function formatJson(value: any, indent: number = 2): string {
  try {
    return JSON.stringify(value, null, indent)
  } catch (error) {
    // Fallback for circular references or non-serializable values
    return String(value)
  }
}
