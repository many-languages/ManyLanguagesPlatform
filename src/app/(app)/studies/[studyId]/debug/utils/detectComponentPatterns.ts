/**
 * Component Structure Pattern Detection
 * Detects patterns across component structures derived from extraction
 */

import { ComponentStructureAnalysis } from "./materializeDebugView"

export interface DetectedPattern {
  type: "nested_object" | "array_of_objects" | "flat_structure" | "mixed" | "inconsistent"
  description: string
  exampleComponents: number[]
  confidence: number // 0-1
}

/**
 * Identify common patterns across components
 */
export function identifyComponentPatterns(
  components: ComponentStructureAnalysis[]
): DetectedPattern[] {
  const patterns: DetectedPattern[] = []
  const componentsWithData = components.filter(
    (c) => c.structureType !== "null" && c.structureType !== "empty"
  )

  if (componentsWithData.length === 0) {
    return patterns
  }

  // Check for nested object pattern (components with depth > 1 and object structure)
  const nestedObjectComponents = componentsWithData.filter(
    (c) => c.maxDepth > 1 && c.structureType === "object"
  )
  if (nestedObjectComponents.length > 0) {
    patterns.push({
      type: "nested_object",
      description: "Nested object structure detected in components",
      exampleComponents: nestedObjectComponents.slice(0, 3).map((c) => c.componentId),
      confidence: nestedObjectComponents.length / componentsWithData.length,
    })
  }

  // Check for array of objects pattern
  const arrayComponents = componentsWithData.filter((c) => c.structureType === "array")
  if (arrayComponents.length > 0) {
    patterns.push({
      type: "array_of_objects",
      description: "Array of objects structure detected",
      exampleComponents: arrayComponents.slice(0, 3).map((c) => c.componentId),
      confidence: arrayComponents.length / componentsWithData.length,
    })
  }

  // Check for flat structure (no nesting)
  const flatComponents = componentsWithData.filter((c) => c.maxDepth <= 1)
  if (flatComponents.length === componentsWithData.length) {
    patterns.push({
      type: "flat_structure",
      description: "Flat structure with no nesting",
      exampleComponents: flatComponents.slice(0, 3).map((c) => c.componentId),
      confidence: 1.0,
    })
  } else if (flatComponents.length > 0) {
    patterns.push({
      type: "mixed",
      description: "Mixed structure with both flat and nested components",
      exampleComponents: [...flatComponents.slice(0, 2), ...nestedObjectComponents.slice(0, 1)].map(
        (c) => c.componentId
      ),
      confidence: 0.5,
    })
  }

  // Check for inconsistency (different structure types)
  const structureTypes = new Set(componentsWithData.map((c) => c.structureType))
  if (structureTypes.size > 1) {
    patterns.push({
      type: "inconsistent",
      description: `Components have inconsistent structure types: ${Array.from(structureTypes).join(
        ", "
      )}`,
      exampleComponents: componentsWithData.slice(0, 3).map((c) => c.componentId),
      confidence: 1.0,
    })
  }

  return patterns
}
