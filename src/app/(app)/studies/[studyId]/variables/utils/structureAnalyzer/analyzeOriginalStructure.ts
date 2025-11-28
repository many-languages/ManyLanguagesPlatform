/**
 * Original Structure Analysis
 * Analyzes the original parsedData structure BEFORE variable extraction
 * This shows the actual data structure as it exists in the JATOS results
 */

import type { EnrichedJatosStudyResult } from "@/src/types/jatos"

export interface OriginalStructureAnalysis {
  // Overall structure type
  structureType: "array" | "object" | "mixed" | "empty"

  // Component-level analysis
  components: ComponentStructureAnalysis[]

  // Aggregated statistics
  statistics: {
    totalComponents: number
    componentsWithData: number
    totalTopLevelGroups: number
    maxNestingDepth: number
    averageNestingDepth: number
  }

  // Structure characteristics
  characteristics: {
    hasNestedObjects: boolean
    hasArrays: boolean
  }

  // Map of top-level key names to their types
  topLevelKeyTypes: Map<string, "primitive" | "array" | "object">
}

export interface ComponentStructureAnalysis {
  componentId: number
  structureType: "array" | "object" | "primitive" | "null" | "empty"
  topLevelKeys: string[] // Top-level keys/groups in the structure
  topLevelKeyTypes: Map<string, "primitive" | "array" | "object"> // Type of each top-level key
  maxDepth: number // Maximum nesting depth in this component
  totalKeys: number // Total number of keys at all levels
}

/**
 * Analyze the original structure of parsedData
 */
export function analyzeOriginalStructure(
  enrichedResult: EnrichedJatosStudyResult
): OriginalStructureAnalysis {
  const components: ComponentStructureAnalysis[] = []

  enrichedResult.componentResults.forEach((component) => {
    if (!component.parsedData) {
      components.push({
        componentId: component.componentId,
        structureType: "null",
        topLevelKeys: [],
        topLevelKeyTypes: new Map(),
        maxDepth: 0,
        totalKeys: 0,
      })
      return
    }

    const data = component.parsedData
    const analysis = analyzeComponentStructure(data, component.componentId)
    components.push(analysis)
  })

  // Calculate aggregated statistics
  const componentsWithData = components.filter(
    (c) => c.structureType !== "null" && c.structureType !== "empty"
  )
  const allTopLevelKeys = new Set<string>()
  const keyTypeMap = new Map<string, "primitive" | "array" | "object">()

  componentsWithData.forEach((c) => {
    c.topLevelKeys.forEach((key) => {
      allTopLevelKeys.add(key)
      // If key exists in this component, track its type
      // If key appears in multiple components, prefer object > array > primitive
      const existingType = keyTypeMap.get(key)
      const currentType = c.topLevelKeyTypes.get(key)

      if (currentType) {
        if (!existingType) {
          keyTypeMap.set(key, currentType)
        } else {
          // Prefer more complex types
          if (
            currentType === "object" ||
            (currentType === "array" && existingType === "primitive")
          ) {
            keyTypeMap.set(key, currentType)
          }
        }
      }
    })
  })

  const maxNestingDepth = Math.max(...componentsWithData.map((c) => c.maxDepth), 0)
  const averageNestingDepth =
    componentsWithData.length > 0
      ? componentsWithData.reduce((sum, c) => sum + c.maxDepth, 0) / componentsWithData.length
      : 0

  // Detect structure characteristics
  const hasArrayStructure = componentsWithData.some((c) => c.structureType === "array")
  const hasObjectStructure = componentsWithData.some((c) => c.structureType === "object")
  const hasNestedObjects = componentsWithData.some((c) => c.maxDepth > 1)
  const hasArrays = componentsWithData.some((c) => c.structureType === "array")

  // Determine overall structure type
  let structureType: "array" | "object" | "mixed" | "empty"
  if (componentsWithData.length === 0) {
    structureType = "empty"
  } else if (hasArrayStructure && !hasObjectStructure) {
    structureType = "array"
  } else if (hasObjectStructure && !hasArrayStructure) {
    structureType = "object"
  } else {
    structureType = "mixed"
  }

  return {
    structureType,
    components,
    statistics: {
      totalComponents: enrichedResult.componentResults.length,
      componentsWithData: componentsWithData.length,
      totalTopLevelGroups: allTopLevelKeys.size,
      maxNestingDepth,
      averageNestingDepth,
    },
    characteristics: {
      hasNestedObjects,
      hasArrays,
    },
    topLevelKeyTypes: keyTypeMap,
  }
}

/**
 * Analyze the structure of a single component's parsedData
 */
function analyzeComponentStructure(data: any, componentId: number): ComponentStructureAnalysis {
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
      // Analyze first item to understand structure
      const firstItem = data[0]

      if (typeof firstItem === "object" && firstItem !== null && !Array.isArray(firstItem)) {
        // Array of objects
        topLevelKeys = Object.keys(firstItem)

        // Determine type of each top-level key
        topLevelKeys.forEach((key) => {
          const value = firstItem[key]
          const valueType = getValueType(value)
          topLevelKeyTypes.set(key, valueType)
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
