import type { Diagnostic, RunFacts } from "../types"
import { aggregateRunFactsByRun } from "./aggregateFactsByRun"

export function materializeRunDiagnostics(
  facts: RunFacts | Map<number, RunFacts>,
  opts?: { maxExamplePaths?: number }
): Diagnostic[] {
  const aggregated = facts instanceof Map ? aggregateRunFactsByRun(facts, opts) : facts
  const diags: Diagnostic[] = []
  const seen = new Set<string>()
  const pushOnce = (d: Diagnostic) => {
    const key = `${d.code}||${d.message}`
    if (seen.has(key)) return
    seen.add(key)
    diags.push(d)
  }

  // Limits -> errors
  for (const e of aggregated.limits.values()) {
    if (e.kind === "MAX_NODES_EXCEEDED") {
      pushOnce({
        severity: "error",
        code: "MAX_NODES_EXCEEDED",
        message: `Maximum node count exceeded (${e.nodeCount} nodes visited)`,
        metadata: { nodeCount: e.nodeCount, threshold: e.threshold },
      })
    } else if (e.kind === "MAX_OBSERVATIONS_EXCEEDED") {
      pushOnce({
        severity: "error",
        code: "MAX_OBSERVATIONS_EXCEEDED",
        message: `Maximum observation count exceeded (stopped at ${e.observationCount} observations, limit: ${e.threshold})`,
        metadata: { observationCount: e.observationCount, threshold: e.threshold },
      })
    } else if (e.kind === "MAX_DEPTH_EXCEEDED") {
      pushOnce({
        severity: "error",
        code: "MAX_DEPTH_EXCEEDED",
        message: `Maximum depth exceeded (depth: ${e.depth}, threshold: ${e.threshold})`,
        metadata: { depth: e.depth, threshold: e.threshold },
      })
    }
  }

  // Derived truncation warning
  if (aggregated.limits.size > 0) {
    pushOnce({
      severity: "warning",
      code: "TRUNCATED_EXTRACTION",
      message: "Extraction was truncated due to limits",
      metadata: {},
    })
  }

  // Deep nesting (max)
  if (aggregated.deepNesting.maxDepth > aggregated.deepNesting.threshold) {
    pushOnce({
      severity: "warning",
      code: "DEEP_NESTING",
      message: `Nesting depth ${aggregated.deepNesting.maxDepth} exceeds threshold (${aggregated.deepNesting.threshold})`,
      metadata: {
        depth: aggregated.deepNesting.maxDepth,
        threshold: aggregated.deepNesting.threshold,
      },
    })
  }

  // Skipped non-json types
  for (const [jsType, data] of aggregated.skippedNonJson.entries()) {
    const message =
      data.count === 1
        ? `Skipped non-JSON type '${jsType}' at path: ${data.examplePaths[0]}`
        : `Skipped non-JSON type '${jsType}' ${
            data.count
          } times (example paths: ${data.examplePaths.join(", ")})`

    pushOnce({
      severity: "warning",
      code: "SKIPPED_NON_JSON_TYPE",
      message,
      metadata: {
        jsType,
        count: data.count,
        examplePaths: data.examplePaths,
        ...(data.tag && { tag: data.tag }),
      },
    })
  }

  return diags
}
