import { useMemo } from "react"
import { ExtractedVariable, ExtractionObservation, ValueType } from "../../variables/types"
import { ExtractionIndexStore } from "../../variables/utils/extractionIndexStore"
import { TopLevelGroup } from "../types"

/**
 * Get top-level key from variableKey
 * Examples:
 * - "$trials[*].rt" -> "trials"
 * - "$[*].something" -> "root"
 * - "$["weird.key"][*].value" -> "weird.key"
 */
function getTopLevelKey(variableKey: string): string | null {
  // Remove $ prefix
  const withoutPrefix = variableKey.startsWith("$") ? variableKey.slice(1) : variableKey
  if (!withoutPrefix) return null

  // Check if it starts with [*] (root array)
  if (withoutPrefix.startsWith("[*]")) return "root"

  // Check if it starts with ["quoted key"]
  const quotedMatch = withoutPrefix.match(/^\["([^"]+)"\]/)
  if (quotedMatch) {
    return quotedMatch[1]
  }

  // Otherwise, parse first segment (simple key before . or [)
  const simpleMatch = withoutPrefix.match(/^([^.[]+)/)
  if (simpleMatch) {
    return simpleMatch[1]
  }

  return null
}

/**
 * Helper to infer structure type from value type
 */
function valueTypeToStructureType(valueType: ValueType): "primitive" | "array" | "object" {
  if (valueType === "array") return "array"
  if (valueType === "object") return "object"
  return "primitive"
}

/**
 * Hook to compute top-level groups with variables and their types
 * Groups variables by their top-level key (e.g., "trials", "responses", "root")
 * and infers the type of each top-level key from observations
 */
export function useTopLevelGroups(
  extractedVariables: ExtractedVariable[],
  indexStore: ExtractionIndexStore,
  observations: ExtractionObservation[]
): Map<string, TopLevelGroup> {
  return useMemo(() => {
    const grouped = new Map<string, ExtractedVariable[]>()

    // First, group variables by top-level key
    for (const variable of extractedVariables) {
      const topLevelKey = getTopLevelKey(variable.variableKey)
      if (!topLevelKey) continue

      // Add variable to the group (variable.componentIds already contains all component IDs)
      if (!grouped.has(topLevelKey)) {
        grouped.set(topLevelKey, [])
      }
      grouped.get(topLevelKey)!.push(variable)
    }

    // Build a map of top-level keys to their keyPath match values
    // For "root", we look for keyPath[0] === "*", otherwise use the key itself
    const topLevelKeyToPathMatch = new Map<string, string>()
    for (const topLevelKey of Array.from(grouped.keys())) {
      topLevelKeyToPathMatch.set(topLevelKey, topLevelKey === "root" ? "*" : topLevelKey)
    }

    // Single pass through all observations to compute types for all top-level keys
    const keyTypes = new Map<string, "primitive" | "array" | "object">()

    for (const obs of observations) {
      if (obs.keyPath.length === 0) continue

      const topKey = obs.keyPath[0]
      if (topKey === "*") {
        // This is a root array observation
        const topLevelKey = "root"
        if (topLevelKeyToPathMatch.has(topLevelKey)) {
          const currentType = valueTypeToStructureType(obs.valueType)
          const existingType = keyTypes.get(topLevelKey)

          // Prefer more complex types (object > array > primitive)
          if (!existingType) {
            keyTypes.set(topLevelKey, currentType)
          } else if (
            currentType === "object" ||
            (currentType === "array" && existingType === "primitive")
          ) {
            keyTypes.set(topLevelKey, currentType)
          }
        }
      } else {
        // Check if this top-level key is in our grouped keys
        if (topLevelKeyToPathMatch.has(topKey)) {
          const currentType = valueTypeToStructureType(obs.valueType)
          const existingType = keyTypes.get(topKey)

          // Prefer more complex types (object > array > primitive)
          if (!existingType) {
            keyTypes.set(topKey, currentType)
          } else if (
            currentType === "object" ||
            (currentType === "array" && existingType === "primitive")
          ) {
            keyTypes.set(topKey, currentType)
          }
        }
      }
    }

    // Build result map with variables and computed types
    const result = new Map<string, TopLevelGroup>()
    for (const [topLevelKey, variables] of Array.from(grouped.entries())) {
      result.set(topLevelKey, {
        variables,
        type: keyTypes.get(topLevelKey) || "object", // Default to object if no type found
      })
    }

    return result
  }, [extractedVariables, indexStore, observations])
}
