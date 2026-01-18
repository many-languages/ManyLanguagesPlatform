import type { RunEvent, RunFacts } from "../types"

/**
 * RunFactsCollector - mutable collector for run-level facts during extraction
 * Collects run-level facts during traversal (limits, deep nesting, skipped non-json types)
 * Used during walk() to collect facts incrementally
 *
 * Notes:
 * - Does NOT store component- or variable-level facts/diagnostics
 * - Stats are tracked separately via StatsTracker in PipelineContext
 */
export class RunFactsCollector {
  // Thresholds / caps
  private readonly deepNestingThreshold: number
  private readonly maxExamplePaths: number

  readonly runFacts: RunFacts

  constructor(args: { deepNestingThreshold: number; maxExamplePaths: number }) {
    this.deepNestingThreshold = args.deepNestingThreshold
    this.maxExamplePaths = args.maxExamplePaths

    this.runFacts = {
      limits: new Map(),
      deepNesting: { threshold: this.deepNestingThreshold, maxDepth: 0 },
      skippedNonJson: new Map(),
    }
  }

  wasTruncated(): boolean {
    return this.runFacts.limits.size > 0
  }

  /**
   * Main internal reducer for run events -> runFacts
   */
  private recordRunEvent(e: RunEvent): void {
    switch (e.kind) {
      case "MAX_DEPTH_EXCEEDED":
      case "MAX_NODES_EXCEEDED":
      case "MAX_OBSERVATIONS_EXCEEDED": {
        // Keep first occurrence only (it already has threshold + observed value)
        if (!this.runFacts.limits.has(e.kind)) this.runFacts.limits.set(e.kind, e)
        return
      }

      case "DEEP_NESTING": {
        // Keep only max depth seen
        if (e.depth > this.runFacts.deepNesting.maxDepth) {
          this.runFacts.deepNesting.maxDepth = e.depth
        }
        return
      }

      case "SKIPPED_NON_JSON_TYPE": {
        const existing = this.runFacts.skippedNonJson.get(e.jsType)
        if (existing) {
          existing.count++
          if (existing.examplePaths.length < this.maxExamplePaths) {
            existing.examplePaths.push(e.path)
          }
          if (e.tag && !existing.tag) existing.tag = e.tag
        } else {
          this.runFacts.skippedNonJson.set(e.jsType, {
            count: 1,
            examplePaths: [e.path],
            tag: e.tag,
          })
        }
        return
      }
    }
  }

  // ----------------------------
  // Public recorders used by walker
  // ----------------------------

  recordDepthWarning(depth: number): void {
    if (depth > this.deepNestingThreshold) {
      this.recordRunEvent({ kind: "DEEP_NESTING", depth, threshold: this.deepNestingThreshold })
    }
  }

  recordMaxNodesExceeded(args: { threshold: number; nodeCount: number }): void {
    this.recordRunEvent({
      kind: "MAX_NODES_EXCEEDED",
      nodeCount: args.nodeCount,
      threshold: args.threshold,
    })
  }

  recordMaxObservationsExceeded(args: { threshold: number; observationCount: number }): void {
    this.recordRunEvent({
      kind: "MAX_OBSERVATIONS_EXCEEDED",
      observationCount: args.observationCount,
      threshold: args.threshold,
    })
  }

  recordMaxDepthExceeded(depth: number, threshold: number): void {
    this.recordRunEvent({ kind: "MAX_DEPTH_EXCEEDED", depth, threshold })
  }

  recordSkippedNonJsonType(path: string, jsType: string, tag?: string): void {
    this.recordRunEvent({ kind: "SKIPPED_NON_JSON_TYPE", jsType, path, tag })
  }
}
