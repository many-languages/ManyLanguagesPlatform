/**
 * Shared utility functions for structure analyzer
 * Avoids duplication of common operations
 */

/**
 * Calculate the nesting depth of a variable path
 * Counts dots (object nesting) and brackets (array nesting)
 *
 * @param path Variable path (e.g., "response.demographics.age" or "trials[*].rt")
 * @returns Depth level (0 = top level, 1+ = nested)
 */
export function calculatePathDepth(path: string): number {
  const dots = (path.match(/\./g) || []).length
  const arrays = (path.match(/\[/g) || []).length
  return dots + arrays
}

/**
 * Extract the root/base path (first segment) of a variable path
 *
 * @param path Variable path
 * @returns Root path segment
 */
export function getRootPath(path: string): string {
  return path.split(/[\.\[]/)[0]
}

/**
 * Extract the parent path of a variable path
 *
 * @param path Variable path
 * @returns Parent path or null if it's a root-level variable
 */
export function getParentPath(path: string): string | null {
  if (!path.includes(".") && !path.includes("[")) {
    return null // Root level
  }

  // Handle array notation
  if (path.includes("[*]")) {
    const beforeBracket = path.split("[*]")[0]
    const afterBracket = path.split("[*]").slice(1).join("[*]")

    if (afterBracket.startsWith(".")) {
      // Format: base[*].child - parent is base[*]
      return beforeBracket + "[*]"
    } else if (beforeBracket.includes(".")) {
      // Format: parent.child[*] - parent is before last dot
      const lastDot = beforeBracket.lastIndexOf(".")
      return lastDot >= 0 ? beforeBracket.substring(0, lastDot) : beforeBracket
    }
    return beforeBracket || null
  }

  // Handle object notation
  if (path.includes(".")) {
    const lastDot = path.lastIndexOf(".")
    return lastDot >= 0 ? path.substring(0, lastDot) : null
  }

  return null
}

/**
 * Check if a path represents an array pattern (contains [*])
 */
export function isArrayPath(path: string): boolean {
  return path.includes("[*]")
}

/**
 * Check if a path represents a nested object (contains dots but no arrays)
 */
export function isNestedObjectPath(path: string): boolean {
  return path.includes(".") && !path.includes("[")
}

/**
 * Check if a path is flat (no nesting)
 */
export function isFlatPath(path: string): boolean {
  return !path.includes(".") && !path.includes("[")
}
