/**
 * Nested Structure Extractor
 * Extracts all nested paths from objects and arrays, creating a flat list of accessible paths.
 *
 * Examples:
 * - `{response: {rating: 5}}` → `response.rating`
 * - `{trials: [{rt: 100, correct: true}]}` → `trials[0].rt`, `trials[0].correct`, `trials[*].rt`, `trials[*].correct`
 */

export interface NestedPath {
  path: string // e.g., "response.rating" or "trials[*].rt"
  type: "string" | "number" | "boolean" | "object" | "array" | "null"
  exampleValue: any
  depth: number // Depth of nesting
}

/**
 * Extract all nested paths from a value, handling objects and arrays recursively
 * @param value The value to extract paths from
 * @param basePath The base path prefix (used for recursion)
 * @param maxDepth Maximum depth to traverse (prevents infinite recursion)
 * @returns Array of all nested paths found
 */
export function extractNestedPaths(value: any, basePath = "", maxDepth = 10): NestedPath[] {
  const paths: NestedPath[] = []

  // Base case: prevent infinite recursion
  if (maxDepth <= 0) {
    return paths
  }

  // Handle null/undefined
  if (value === null || value === undefined) {
    if (basePath) {
      paths.push({
        path: basePath,
        type: "null",
        exampleValue: null,
        depth: basePath.split(".").length + basePath.split("[").length - 1,
      })
    }
    return paths
  }

  // Handle arrays
  if (Array.isArray(value)) {
    if (value.length === 0) {
      // Empty array - still record it
      if (basePath) {
        paths.push({
          path: basePath,
          type: "array",
          exampleValue: [],
          depth: basePath.split(".").length + basePath.split("[").length - 1,
        })
      }
      return paths
    }

    // Check if array contains objects - if so, extract paths from each object
    const hasObjects = value.some(
      (item) => typeof item === "object" && item !== null && !Array.isArray(item)
    )
    const hasArrays = value.some(Array.isArray)

    if (hasObjects || hasArrays) {
      // Collect all unique paths from all array items using wildcard notation
      const itemPathsMap = new Map<string, { type: string; exampleValue: any }>()

      value.forEach((item) => {
        // Extract paths using wildcard notation for arrays
        const wildcardPaths = extractNestedPaths(item, `${basePath}[*]`, maxDepth - 1)

        // Merge paths, preferring non-null example values
        wildcardPaths.forEach((p) => {
          const existing = itemPathsMap.get(p.path)
          if (!existing) {
            itemPathsMap.set(p.path, { type: p.type, exampleValue: p.exampleValue })
          } else if (p.exampleValue !== null && existing.exampleValue === null) {
            // Prefer non-null example values
            existing.exampleValue = p.exampleValue
            existing.type = p.type
          }
        })
      })

      // Convert to NestedPath format
      itemPathsMap.forEach(({ type, exampleValue }, path) => {
        paths.push({
          path,
          type: type as NestedPath["type"],
          exampleValue,
          depth: path.split(".").length + path.split("[").length - 1,
        })
      })
    } else {
      // Array of primitives - record the array itself
      if (basePath) {
        paths.push({
          path: basePath,
          type: "array",
          exampleValue: value,
          depth: basePath.split(".").length + basePath.split("[").length - 1,
        })
      }
    }

    return paths
  }

  // Handle objects
  if (typeof value === "object") {
    const keys = Object.keys(value)

    if (keys.length === 0) {
      // Empty object - still record it
      if (basePath) {
        paths.push({
          path: basePath,
          type: "object",
          exampleValue: {},
          depth: basePath.split(".").length + basePath.split("[").length - 1,
        })
      }
      return paths
    }

    // Recursively extract paths from each property
    keys.forEach((key) => {
      const newPath = basePath ? `${basePath}.${key}` : key
      const nestedValue = value[key]

      // Determine the type
      let valueType: NestedPath["type"]
      if (nestedValue === null) {
        valueType = "null"
      } else if (Array.isArray(nestedValue)) {
        valueType = "array"
      } else if (typeof nestedValue === "object") {
        valueType = "object"
      } else if (typeof nestedValue === "string") {
        valueType = "string"
      } else if (typeof nestedValue === "number") {
        valueType = "number"
      } else if (typeof nestedValue === "boolean") {
        valueType = "boolean"
      } else {
        valueType = "string" // fallback
      }

      // If it's a primitive, null, or empty array/object, record it as a leaf
      if (
        valueType !== "object" ||
        nestedValue === null ||
        (Array.isArray(nestedValue) && nestedValue.length === 0) ||
        (typeof nestedValue === "object" && Object.keys(nestedValue).length === 0)
      ) {
        paths.push({
          path: newPath,
          type: valueType,
          exampleValue: nestedValue,
          depth: newPath.split(".").length + newPath.split("[").length - 1,
        })
      }

      // Recursively extract nested paths
      const nestedPaths = extractNestedPaths(nestedValue, newPath, maxDepth - 1)
      paths.push(...nestedPaths)
    })

    return paths
  }

  // Handle primitives - these are leaf nodes
  if (basePath) {
    let primitiveType: NestedPath["type"]
    if (typeof value === "string") {
      primitiveType = "string"
    } else if (typeof value === "number") {
      primitiveType = "number"
    } else if (typeof value === "boolean") {
      primitiveType = "boolean"
    } else {
      primitiveType = "string" // fallback
    }

    paths.push({
      path: basePath,
      type: primitiveType,
      exampleValue: value,
      depth: basePath.split(".").length + basePath.split("[").length - 1,
    })
  }

  return paths
}

/**
 * Extract nested paths from multiple values, merging them intelligently
 * Useful when processing arrays of objects where different objects may have different structures
 * @param values Array of values to extract paths from
 * @param basePath Base path prefix
 * @returns Merged array of nested paths
 */
export function extractNestedPathsFromMultiple(
  values: any[],
  basePath = "",
  maxDepth = 10
): NestedPath[] {
  const pathsMap = new Map<string, NestedPath>()

  values.forEach((value) => {
    const paths = extractNestedPaths(value, basePath, maxDepth)

    paths.forEach((path) => {
      const existing = pathsMap.get(path.path)

      if (!existing) {
        pathsMap.set(path.path, path)
      } else {
        // Merge: prefer non-null example values, update type if needed
        if (path.exampleValue !== null && existing.exampleValue === null) {
          existing.exampleValue = path.exampleValue
          existing.type = path.type
        } else if (path.type !== "null" && existing.type === "null") {
          existing.type = path.type
        }
      }
    })
  })

  return Array.from(pathsMap.values()).sort((a, b) => {
    // Sort by depth first, then alphabetically
    if (a.depth !== b.depth) {
      return a.depth - b.depth
    }
    return a.path.localeCompare(b.path)
  })
}
