/**
 * Component Path Extractor
 * Extracts nested paths from component data based on structure analysis
 * Used for displaying extracted variables from object-type keys in components
 */

import type { EnrichedJatosStudyResult } from "@/src/types/jatos"
import type {
  ComponentStructureAnalysis,
  OriginalStructureAnalysis,
} from "./structureAnalyzer/analyzeOriginalStructure"
import type { NestedPath } from "./nestedStructureExtractor"
import { extractNestedPaths } from "./nestedStructureExtractor"

/**
 * Extract nested paths from object-type keys in a component's parsed data
 * Based on the component's structure analysis
 *
 * @param parsedData The parsed data from the component
 * @param componentAnalysis The structure analysis for this component
 * @returns Map of parent keys to their nested paths
 */
export function getExtractedPathsForComponent(
  parsedData: any,
  componentAnalysis: ComponentStructureAnalysis | undefined
): Map<string, NestedPath[]> {
  const extractedPathsByKey = new Map<string, NestedPath[]>()

  if (!parsedData || !componentAnalysis) return extractedPathsByKey

  // Find all object-type top-level keys
  const objectKeys = componentAnalysis.topLevelKeys.filter(
    (key) => componentAnalysis.topLevelKeyTypes.get(key) === "object"
  )

  if (objectKeys.length === 0) return extractedPathsByKey

  // Extract nested paths from each object key
  objectKeys.forEach((objectKey) => {
    let objectValue: any = null

    if (
      componentAnalysis.structureType === "array" &&
      Array.isArray(parsedData) &&
      parsedData.length > 0
    ) {
      // For array structures, get the value from first item
      const firstItem = parsedData[0]
      objectValue = firstItem?.[objectKey]
    } else if (
      componentAnalysis.structureType === "object" &&
      typeof parsedData === "object" &&
      parsedData !== null
    ) {
      objectValue = parsedData[objectKey]
    }

    // Only extract if it's actually an object (not array, not null)
    if (objectValue && typeof objectValue === "object" && !Array.isArray(objectValue)) {
      const nestedPaths = extractNestedPaths(objectValue, objectKey)
      // Filter to include all paths that start with this object key (excluding the key itself)
      const allNestedPaths = nestedPaths.filter(
        (path) => path.path !== objectKey && path.path.startsWith(`${objectKey}.`)
      )

      // Deduplicate paths by path string to avoid duplicate keys in React
      const uniquePathsMap = new Map<string, NestedPath>()
      allNestedPaths.forEach((path) => {
        if (!uniquePathsMap.has(path.path)) {
          uniquePathsMap.set(path.path, path)
        }
      })

      const uniquePaths = Array.from(uniquePathsMap.values())

      if (uniquePaths.length > 0) {
        extractedPathsByKey.set(objectKey, uniquePaths)
      }
    }
  })

  return extractedPathsByKey
}

/**
 * Aggregate extracted paths from all components, grouped by parent key
 * Deduplicates paths across components
 *
 * @param enrichedResult The enriched JATOS study result
 * @param originalStructureAnalysis The structure analysis for all components
 * @returns Map of parent keys to arrays of paths with their component IDs
 */
export function aggregatePathsByParentKey(
  enrichedResult: EnrichedJatosStudyResult,
  originalStructureAnalysis: OriginalStructureAnalysis
): Map<string, Array<{ path: NestedPath; componentId: number }>> {
  const pathsByParentKey = new Map<string, Array<{ path: NestedPath; componentId: number }>>()

  enrichedResult.componentResults.forEach((component) => {
    const componentAnalysis = originalStructureAnalysis.components.find(
      (c) => c.componentId === component.componentId
    )
    const extractedPathsByKey = getExtractedPathsForComponent(
      component.parsedData,
      componentAnalysis
    )

    // Group paths by their parent key (first part of the path)
    extractedPathsByKey.forEach((paths, parentKey) => {
      paths.forEach((path) => {
        if (!pathsByParentKey.has(parentKey)) {
          pathsByParentKey.set(parentKey, [])
        }
        pathsByParentKey.get(parentKey)!.push({
          path,
          componentId: component.componentId,
        })
      })
    })
  })

  // Deduplicate paths by path string across all components
  const deduplicated = new Map<string, Array<{ path: NestedPath; componentId: number }>>()
  pathsByParentKey.forEach((pathsWithComponents, parentKey) => {
    const uniquePaths = new Map<string, { path: NestedPath; componentId: number }>()
    pathsWithComponents.forEach(({ path, componentId }) => {
      if (!uniquePaths.has(path.path)) {
        uniquePaths.set(path.path, { path, componentId })
      }
    })
    if (uniquePaths.size > 0) {
      deduplicated.set(parentKey, Array.from(uniquePaths.values()))
    }
  })

  return deduplicated
}
