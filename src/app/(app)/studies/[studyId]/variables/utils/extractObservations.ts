import { EnrichedJatosStudyResult } from "@/src/types/jatos"
import { NewExtractionResult } from "../types"
import { DiagnosticEngine } from "./diagnostics"
import { transformCsvToObject } from "./transformCsvToObject"
import { walk } from "./walker"

/**
 * Extract observations from enriched JATOS result
 * Uses new walker-based extraction system
 * Returns observations, diagnostics, and stats
 */
export function extractObservations(enrichedResult: EnrichedJatosStudyResult): NewExtractionResult {
  const allObservations: NewExtractionResult["observations"] = []
  // Single DiagnosticEngine for all components (tracks stats across all components)
  const diagnosticEngine = new DiagnosticEngine(50000)

  enrichedResult.componentResults.forEach((component) => {
    const componentId = component.componentId

    if (!component.parsedData && !component.dataContent) {
      diagnosticEngine.addComponentDiagnostic(String(componentId), {
        severity: "warning",
        code: "EMPTY_OR_NO_DATA",
        level: "component",
        message: `Component ${componentId} has no data or empty data`,
        metadata: { componentId },
      })
      return
    }

    // Check for parse errors (component-level)
    if (component.parseError) {
      diagnosticEngine.addComponentDiagnostic(String(componentId), {
        severity: "error",
        code: "PARSE_ERROR",
        level: "component",
        message: `Parse error: ${component.parseError}`,
        metadata: {
          componentId,
          error: component.parseError,
        },
      })
      return
    }

    const format = component.detectedFormat?.format
    const parsedData = component.parsedData

    // Build scopeKeys (currently just componentId, but structure allows for future JATOS fields)
    const scopeKeys = { componentId }

    // Handle different formats
    if (format === "csv" || format === "tsv") {
      // CSV/TSV: Transform to object structure, then walk
      if (Array.isArray(parsedData)) {
        const transformedData = transformCsvToObject(parsedData)
        if (transformedData) {
          const result = walk(transformedData, { componentId, scopeKeys }, diagnosticEngine)
          allObservations.push(...result.observations)
        } else {
          // Component-level: EMPTY_OR_NO_DATA
          diagnosticEngine.addComponentDiagnostic(String(componentId), {
            severity: "warning",
            code: "EMPTY_OR_NO_DATA",
            level: "component",
            message: "CSV/TSV data is empty, invalid, or has no columns",
            metadata: { componentId, format },
          })
        }
      } else {
        diagnosticEngine.addComponentDiagnostic(String(componentId), {
          severity: "warning",
          code: "UNKNOWN_FORMAT",
          level: "component",
          message: "CSV/TSV data is not an array after parsing",
          metadata: { componentId, format },
        })
      }
    } else if (format === "json") {
      // JSON: Walk the parsed data directly
      if (parsedData !== undefined && parsedData !== null) {
        const result = walk(parsedData, { componentId, scopeKeys }, diagnosticEngine)
        allObservations.push(...result.observations)
      } else {
        diagnosticEngine.addComponentDiagnostic(String(componentId), {
          severity: "warning",
          code: "EMPTY_OR_NO_DATA",
          level: "component",
          message: "JSON data is null or undefined",
          metadata: { componentId, format },
        })
      }
    } else if (format === "text") {
      diagnosticEngine.addComponentDiagnostic(String(componentId), {
        severity: "error",
        code: "TEXT_FORMAT_NOT_SUPPORTED",
        level: "component",
        message:
          "Text format data cannot be processed for variable extraction - data is unstructured",
        metadata: { componentId, format },
      })
    } else {
      diagnosticEngine.addComponentDiagnostic(String(componentId), {
        severity: "warning",
        code: "UNKNOWN_FORMAT",
        level: "component",
        message: `Unknown format: ${format || "undefined"}`,
        metadata: { componentId, format },
      })
    }
  })

  // Get diagnostics by level from DiagnosticEngine
  // This automatically finalizes run-level diagnostics (cardinality, skipped non-JSON types, truncation)
  const { component: componentDiagnostics, run: runDiagnostics } =
    diagnosticEngine.getDiagnosticsByLevel()

  return {
    observations: allObservations,
    componentDiagnostics, // Map keyed by componentId
    runDiagnostics, // Already includes TRUNCATED_EXTRACTION if needed
    stats: diagnosticEngine.getStats(), // Use engine's aggregated stats (already includes all components)
    diagnosticEngine, // Expose for aggregation (contains facts)
  }
}
