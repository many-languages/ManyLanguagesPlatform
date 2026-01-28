import type { ComponentFacts, Diagnostic } from "../types"
import { aggregateComponentFactsByRun } from "./aggregateFactsByRun"

export function materializeComponentDiagnostics(
  facts: ComponentFacts | Map<number, ComponentFacts>
): Map<number, Diagnostic[]> {
  const firstValue = facts.values().next().value
  const aggregated =
    firstValue instanceof Map
      ? aggregateComponentFactsByRun(facts as Map<number, ComponentFacts>)
      : facts
  const byComponentId = new Map<number, Diagnostic[]>()

  for (const [componentId, fact] of aggregated.entries()) {
    const diags: Diagnostic[] = []

    if (!fact.hasParsedData && !fact.hasDataContent) {
      diags.push({
        severity: "warning",
        code: "EMPTY_OR_NO_DATA",
        message: `Component ${componentId} has no data or empty data`,
        metadata: { componentId },
      })
    }

    if (fact.parseError) {
      diags.push({
        severity: "error",
        code: "PARSE_ERROR",
        message: `Parse error: ${fact.parseError}`,
        metadata: { componentId, error: fact.parseError },
      })
    }

    if (fact.formatError) {
      const severity = fact.formatError.code === "TEXT_FORMAT_NOT_SUPPORTED" ? "error" : "warning"
      diags.push({
        severity,
        code: fact.formatError.code,
        message: fact.formatError.message,
        metadata: { componentId, format: fact.detectedFormat },
      })
    }

    if (diags.length > 0) {
      byComponentId.set(componentId, diags)
    }
  }

  return byComponentId
}
