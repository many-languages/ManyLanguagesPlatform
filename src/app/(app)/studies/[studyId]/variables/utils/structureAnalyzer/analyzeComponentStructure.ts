/**
 * Component Structure Analysis
 * Analyzes the structure of a single component's parsedData
 */

export interface ComponentStructureAnalysis {
  componentId: number
  structureType: "array" | "object" | "primitive" | "null" | "empty"
  topLevelKeys: string[] // Top-level keys/groups in the structure
  topLevelKeyTypes: Map<string, "primitive" | "array" | "object"> // Type of each top-level key
  maxDepth: number // Maximum nesting depth in this component
  totalKeys: number // Total number of keys at all levels
}

/**
 * Get the type of a value for top-level key classification
 */
function getValueType(value: any): "primitive" | "array" | "object" {
  if (Array.isArray(value)) return "array"
  if (typeof value === "object" && value !== null) return "object"
  return "primitive"
}

/**
 * Calculate maximum nesting depth of an object/array
 */
function calculateMaxDepth(value: any, currentDepth = 0, maxDepthSeen = 0): number {
  if (value === null || value === undefined) {
    return currentDepth
  }

  const newMax = Math.max(currentDepth, maxDepthSeen)

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return newMax
    }
    // For arrays, check depth of items
    return Math.max(
      ...value.map((item) => calculateMaxDepth(item, currentDepth + 1, newMax)),
      newMax
    )
  }

  if (typeof value === "object") {
    const keys = Object.keys(value)
    if (keys.length === 0) {
      return newMax
    }
    // For objects, recurse into values
    return Math.max(
      ...Object.values(value).map((val) => calculateMaxDepth(val, currentDepth + 1, newMax)),
      newMax
    )
  }

  return newMax
}

/**
 * Collect all keys from nested structure
 */
function collectAllKeys(value: any, keys: Set<string>, prefix = ""): void {
  if (value === null || value === undefined) {
    return
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      if (typeof item === "object" && item !== null) {
        collectAllKeys(item, keys, `${prefix}[${index}]`)
      }
    })
  } else if (typeof value === "object") {
    Object.keys(value).forEach((key) => {
      const newKey = prefix ? `${prefix}.${key}` : key
      keys.add(newKey)
      collectAllKeys(value[key], keys, newKey)
    })
  }
}

/**
 * Analyze the structure of a single component's parsedData
 */
export function analyzeComponentStructure(
  data: any,
  componentId: number
): ComponentStructureAnalysis {
  if (data === null || data === undefined) {
    return {
      componentId,
      structureType: "null",
      topLevelKeys: [],
      topLevelKeyTypes: new Map(),
      maxDepth: 0,
      totalKeys: 0,
    }
  }

  // Determine structure type
  let structureType: "array" | "object" | "primitive" | "null" | "empty"
  let topLevelKeys: string[] = []
  let topLevelKeyTypes = new Map<string, "primitive" | "array" | "object">()
  let maxDepth = 0
  let totalKeys = 0

  if (Array.isArray(data)) {
    structureType = data.length === 0 ? "empty" : "array"

    if (data.length > 0) {
      // Analyze all items to understand structure
      const firstItem = data[0]

      if (typeof firstItem === "object" && firstItem !== null && !Array.isArray(firstItem)) {
        // Array of objects - collect keys from ALL items
        const allTopLevelKeys = new Set<string>()
        data.forEach((item) => {
          if (typeof item === "object" && item !== null && !Array.isArray(item)) {
            Object.keys(item).forEach((key) => allTopLevelKeys.add(key))
          }
        })
        topLevelKeys = Array.from(allTopLevelKeys)

        // Determine type of each top-level key across all items
        topLevelKeys.forEach((key) => {
          // Check type in all items that have this key
          const types = new Set<"primitive" | "array" | "object">()
          data.forEach((item) => {
            if (typeof item === "object" && item !== null && !Array.isArray(item) && key in item) {
              types.add(getValueType(item[key]))
            }
          })
          // Use the most complex type found (object > array > primitive)
          let finalType: "primitive" | "array" | "object" = "primitive"
          if (types.has("object")) {
            finalType = "object"
          } else if (types.has("array")) {
            finalType = "array"
          } else {
            finalType = "primitive"
          }
          topLevelKeyTypes.set(key, finalType)
        })

        // Calculate depth across all items
        const depths = data.map((item) => calculateMaxDepth(item))
        maxDepth = Math.max(...depths, 0)

        // Count total unique keys across all items
        const allKeys = new Set<string>()
        data.forEach((item) => {
          if (typeof item === "object" && item !== null) {
            collectAllKeys(item, allKeys)
          }
        })
        totalKeys = allKeys.size
      } else {
        // Array of primitives
        maxDepth = 1
        totalKeys = 1
      }
    }
  } else if (typeof data === "object") {
    structureType = Object.keys(data).length === 0 ? "empty" : "object"
    topLevelKeys = Object.keys(data)

    // Determine type of each top-level key
    topLevelKeys.forEach((key) => {
      const value = data[key]
      const valueType = getValueType(value)
      topLevelKeyTypes.set(key, valueType)
    })

    maxDepth = calculateMaxDepth(data)
    const allKeys = new Set<string>()
    collectAllKeys(data, allKeys)
    totalKeys = allKeys.size > 0 ? allKeys.size : Object.keys(data).length
  } else {
    structureType = "primitive"
    maxDepth = 0
    totalKeys = 0
  }

  return {
    componentId,
    structureType,
    topLevelKeys,
    topLevelKeyTypes,
    maxDepth,
    totalKeys,
  }
}
