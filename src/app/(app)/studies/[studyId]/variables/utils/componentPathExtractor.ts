/**
 * Component Path Extractor
 * Helper functions for grouping extracted variables by component and parent key
 * Used for displaying extracted variables from object-type keys in components
 */

import type {
  ComponentStructureAnalysis,
  OriginalStructureAnalysis,
} from "./structureAnalyzer/analyzeOriginalStructure"
import type { ExtractedVariable } from "../types"

/**
 * Aggregate extracted variables from all components, grouped by parent key
 * Uses ExtractedVariable instead of re-extracting paths
 *
 * @param extractedVariables The extracted variables from extractVariables()
 * @param originalStructureAnalysis The structure analysis for all components
 * @returns Map of parent keys to arrays of variables with their component IDs
 */
export function aggregateVariablesByParentKey(
  extractedVariables: ExtractedVariable[],
  originalStructureAnalysis: OriginalStructureAnalysis
): Map<string, Array<{ variable: ExtractedVariable; componentId: number }>> {
  const variablesByParentKey = new Map<
    string,
    Array<{ variable: ExtractedVariable; componentId: number }>
  >()

  // Get all object-type top-level keys across all components
  const objectKeys = new Set<string>()
  originalStructureAnalysis.components.forEach((component) => {
    component.topLevelKeys.forEach((key) => {
      if (component.topLevelKeyTypes.get(key) === "object") {
        objectKeys.add(key)
      }
    })
  })

  // Filter variables that are nested under object-type keys
  extractedVariables.forEach((variable) => {
    // Check if variable path starts with any object key
    for (const objectKey of objectKeys) {
      if (
        variable.variableName.startsWith(`${objectKey}.`) ||
        variable.variableName.startsWith(`${objectKey}[*].`)
      ) {
        // This variable is nested under this object key
        // Add it for each componentId it appears in
        variable.componentIds.forEach((componentId) => {
          if (!variablesByParentKey.has(objectKey)) {
            variablesByParentKey.set(objectKey, [])
          }
          variablesByParentKey.get(objectKey)!.push({
            variable,
            componentId,
          })
        })
        break // Only add once per variable
      }
    }
  })

  // Deduplicate by variableName and componentId
  const deduplicated = new Map<
    string,
    Array<{ variable: ExtractedVariable; componentId: number }>
  >()
  variablesByParentKey.forEach((variablesWithComponents, parentKey) => {
    const uniqueVariables = new Map<string, { variable: ExtractedVariable; componentId: number }>()
    variablesWithComponents.forEach(({ variable, componentId }) => {
      const key = `${variable.variableName}-${componentId}`
      if (!uniqueVariables.has(key)) {
        uniqueVariables.set(key, { variable, componentId })
      }
    })
    if (uniqueVariables.size > 0) {
      deduplicated.set(parentKey, Array.from(uniqueVariables.values()))
    }
  })

  return deduplicated
}

/**
 * Get extracted variables for a specific component, filtered to nested paths from object-type keys
 *
 * @param extractedVariables All extracted variables
 * @param componentId The component ID to filter for
 * @param componentAnalysis The structure analysis for this component
 * @returns Map of parent keys to their nested variables
 */
export function getExtractedVariablesForComponent(
  extractedVariables: ExtractedVariable[],
  componentId: number,
  componentAnalysis: ComponentStructureAnalysis | undefined
): Map<string, ExtractedVariable[]> {
  const extractedVariablesByKey = new Map<string, ExtractedVariable[]>()

  if (!componentAnalysis) return extractedVariablesByKey

  // Find all object-type top-level keys
  const objectKeys = componentAnalysis.topLevelKeys.filter(
    (key) => componentAnalysis.topLevelKeyTypes.get(key) === "object"
  )

  if (objectKeys.length === 0) return extractedVariablesByKey

  // Filter variables that belong to this component and are nested under object keys
  objectKeys.forEach((objectKey) => {
    const nestedVariables = extractedVariables.filter(
      (variable) =>
        variable.componentIds.includes(componentId) &&
        (variable.variableName.startsWith(`${objectKey}.`) ||
          variable.variableName.startsWith(`${objectKey}[*].`)) &&
        variable.variableName !== objectKey
    )

    if (nestedVariables.length > 0) {
      extractedVariablesByKey.set(objectKey, nestedVariables)
    }
  })

  return extractedVariablesByKey
}
