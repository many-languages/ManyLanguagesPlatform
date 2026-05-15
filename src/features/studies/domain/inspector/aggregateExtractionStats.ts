import type { SerializedDiagnostics } from "../setup/serializeExtractionBundle"

export interface ExtractionDashboardStats {
  runCount: number
  variableCount: number
  /** Total diagnostics across variable, component, and per-run buckets. */
  variableIssueCount: number
  variableErrorCount: number
  variableWarningCount: number
  /** Total diagnostics in the cross-run (structural consistency) bucket. */
  structuralIssueCount: number
  structuralErrorCount: number
  structuralWarningCount: number
}

/**
 * Aggregates diagnostic counts from a serialised extraction bundle into the
 * flat stats object consumed by the Step 4 dashboard.
 *
 * Pure function — no React, no IO.
 */
export function aggregateExtractionStats(
  diagnostics: SerializedDiagnostics,
  variableCount: number,
  runCount: number
): ExtractionDashboardStats {
  const allVariableDiags = Array.from(diagnostics.variable ?? []).flatMap(([, v]) => v.diagnostics)
  const allComponentDiags = Array.from(diagnostics.component ?? []).flatMap(([, d]) => d)
  const allRunDiags = diagnostics.run ?? []
  const allCrossRunDiags = diagnostics.crossRun
    ? [
        ...diagnostics.crossRun.run,
        ...Array.from(diagnostics.crossRun.component).flatMap(([, d]) => d),
        ...Array.from(diagnostics.crossRun.variable).flatMap(([, v]) => v.diagnostics),
      ]
    : []

  const allExtractionDiags = [...allVariableDiags, ...allComponentDiags, ...allRunDiags]

  return {
    runCount,
    variableCount,
    variableIssueCount: allExtractionDiags.length,
    variableErrorCount: allExtractionDiags.filter((d) => d.severity === "error").length,
    variableWarningCount: allExtractionDiags.filter((d) => d.severity === "warning").length,
    structuralIssueCount: allCrossRunDiags.length,
    structuralErrorCount: allCrossRunDiags.filter((d) => d.severity === "error").length,
    structuralWarningCount: allCrossRunDiags.filter((d) => d.severity === "warning").length,
  }
}
