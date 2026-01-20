import type { ComponentFacts, Diagnostic } from "../types"

export function materializeComponentDiagnostics(facts: ComponentFacts): Map<number, Diagnostic[]> {
  const byComponentId = new Map<number, Diagnostic[]>()

  for (const [componentId, fact] of facts.entries()) {
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
