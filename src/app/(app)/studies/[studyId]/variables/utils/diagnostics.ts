import type { Diagnostic, DiagnosticCode, ExtractionObservation, ExtractionStats } from "../types"

/**
 * Create a stable string representation of context for duplicate detection
 * Sorts keys to ensure consistent ordering regardless of object key order
 */
function stableContextKey(ctx: Record<string, string | number>): string {
  const keys = Object.keys(ctx).sort()
  return keys.map((k) => `${k}:${ctx[k]}`).join("|")
}

/**
 * Diagnostic Engine - collects warnings and diagnostics during extraction
 * Tracks type drift, duplicates, cardinality issues, and other problems
 */
export class DiagnosticEngine {
  // Track variable types: variable -> type -> count
  private variableTypes: Map<string, Map<string, number>> = new Map()

  // Track observation keys for duplicate detection: "variable|contextString"
  private observationKeys: Set<string> = new Set()

  // Statistics
  private nodeCount: number = 0
  private rowCount: number = 0
  private maxDepthSeen: number = 0
  private variableCounts: Map<string, number> = new Map()
  private variableNullCounts: Map<string, number> = new Map()
  private variableLengths: Map<string, { min?: number; max?: number }> = new Map()

  // Diagnostics collected
  private diagnostics: Diagnostic[] = []

  // Track skipped non-JSON types: jsType -> { count, examplePaths[], tag? }
  private skippedNonJsonTypes: Map<
    string,
    { count: number; examplePaths: string[]; tag?: string }
  > = new Map()

  // Thresholds
  private readonly maxObservationsPerVariable: number = 10000
  private readonly deepNestingThreshold: number = 8
  private readonly maxExamplePaths: number = 3
  private readonly maxObservations: number

  constructor(maxObservations: number = 50000) {
    this.maxObservations = maxObservations
  }

  /**
   * Record an observation and check for issues
   */
  recordObservation(obs: ExtractionObservation): void {
    this.rowCount++
    const variable = obs.variable

    // Track variable count
    this.variableCounts.set(variable, (this.variableCounts.get(variable) || 0) + 1)

    // Track type
    if (!this.variableTypes.has(variable)) {
      this.variableTypes.set(variable, new Map())
    }
    const typeMap = this.variableTypes.get(variable)!
    const currentCount = typeMap.get(obs.valueType) || 0
    const isNewType = currentCount === 0 && typeMap.size > 0 // New type and we already had at least one type
    typeMap.set(obs.valueType, currentCount + 1)

    // Check for type drift only when a new type is introduced
    if (isNewType) {
      const types = Array.from(typeMap.entries())
        .map(([type, count]) => `${type}(${count})`)
        .join(", ")
      this.addDiagnostic({
        severity: "warning",
        code: "TYPE_DRIFT",
        message: `Variable '${variable}' has multiple types: ${types}`,
        metadata: {
          variable,
          types: Object.fromEntries(typeMap),
        },
      })
    }

    // Track null count
    if (obs.valueType === "null") {
      this.variableNullCounts.set(variable, (this.variableNullCounts.get(variable) || 0) + 1)
    }

    // Track lengths for arrays and strings
    if (obs.valueType === "array" || obs.valueType === "string") {
      try {
        const parsed = JSON.parse(obs.valueJson)
        const length = Array.isArray(parsed) ? parsed.length : String(parsed).length
        const current = this.variableLengths.get(variable) || {}
        this.variableLengths.set(variable, {
          min: current.min !== undefined ? Math.min(current.min, length) : length,
          max: current.max !== undefined ? Math.max(current.max, length) : length,
        })
      } catch {
        // Ignore parse errors for length tracking
      }
    }

    // Check for duplicate observations
    const contextKey = stableContextKey(obs.context)
    // Include path in key if context is empty to avoid false positives
    // (when context is empty, two observations with same variable but different paths
    // would otherwise look like duplicates)
    const observationKey =
      Object.keys(obs.context).length === 0
        ? `${variable}|${obs.path}|${contextKey}`
        : `${variable}|${contextKey}`
    if (this.observationKeys.has(observationKey)) {
      this.addDiagnostic({
        severity: "warning",
        code: "DUPLICATE_OBSERVATION",
        message: `Duplicate observation for variable '${variable}' with context ${contextKey}`,
        metadata: {
          variable,
          context: obs.context,
          path: obs.path,
        },
      })
    } else {
      this.observationKeys.add(observationKey)
    }
  }

  /**
   * Increment node count (called for each node visited during traversal)
   */
  incrementNodeCount(): void {
    this.nodeCount++
  }

  /**
   * Update max depth seen
   */
  updateDepth(depth: number): void {
    if (depth > this.maxDepthSeen) {
      this.maxDepthSeen = depth
    }
  }

  /**
   * Check cardinality and add diagnostics if needed
   */
  checkCardinality(): void {
    // Check for exploding cardinality per variable
    for (const [variable, count] of this.variableCounts.entries()) {
      if (count > this.maxObservationsPerVariable) {
        this.addDiagnostic({
          severity: "warning",
          code: "EXPLODING_CARDINALITY",
          message: `Variable '${variable}' has ${count} observations (threshold: ${this.maxObservationsPerVariable})`,
          metadata: {
            variable,
            count,
            threshold: this.maxObservationsPerVariable,
          },
        })
      }
    }

    // Check overall row count
    if (this.rowCount > this.maxObservations) {
      this.addDiagnostic({
        severity: "warning",
        code: "EXPLODING_CARDINALITY",
        message: `Total observations (${this.rowCount}) exceeds recommended limit`,
        metadata: {
          rowCount: this.rowCount,
          threshold: this.maxObservations,
        },
      })
    }
  }

  /**
   * Check depth and add diagnostic if too deep
   */
  checkDepth(depth: number): void {
    if (depth > this.deepNestingThreshold) {
      this.addDiagnostic({
        severity: "warning",
        code: "DEEP_NESTING",
        message: `Nesting depth ${depth} exceeds threshold (${this.deepNestingThreshold})`,
        metadata: {
          depth,
          threshold: this.deepNestingThreshold,
        },
      })
    }
  }

  /**
   * Add a diagnostic for max nodes exceeded
   */
  recordMaxNodesExceeded(): void {
    this.addDiagnostic({
      severity: "error",
      code: "MAX_NODES_EXCEEDED",
      message: `Maximum node count exceeded (${this.nodeCount} nodes visited)`,
      metadata: {
        nodeCount: this.nodeCount,
      },
    })
  }

  /**
   * Add a diagnostic for max observations exceeded
   */
  recordMaxObservationsExceeded(): void {
    this.addDiagnostic({
      severity: "error",
      code: "MAX_OBSERVATIONS_EXCEEDED",
      message: `Maximum observation count exceeded (${this.rowCount} observations, limit: ${this.maxObservations})`,
      metadata: {
        rowCount: this.rowCount,
        threshold: this.maxObservations,
      },
    })
  }

  /**
   * Add a diagnostic for max depth exceeded
   */
  recordMaxDepthExceeded(depth: number, threshold: number): void {
    this.addDiagnostic({
      severity: "error",
      code: "MAX_DEPTH_EXCEEDED",
      message: `Maximum depth exceeded (depth: ${depth}, threshold: ${threshold})`,
      metadata: {
        depth,
        threshold,
      },
    })
  }

  /**
   * Record a skipped non-JSON type with rate limiting
   * One warning per JS type per extraction, with count and up to 3 example paths
   */
  recordSkippedNonJsonType(path: string, jsType: string, tag?: string): void {
    const existing = this.skippedNonJsonTypes.get(jsType)
    if (existing) {
      existing.count++
      // Only store up to maxExamplePaths example paths
      if (existing.examplePaths.length < this.maxExamplePaths) {
        existing.examplePaths.push(path)
      }
      // Update tag if provided (keep first tag encountered)
      if (tag && !existing.tag) {
        existing.tag = tag
      }
    } else {
      this.skippedNonJsonTypes.set(jsType, {
        count: 1,
        examplePaths: [path],
        tag,
      })
    }
  }

  /**
   * Get all collected diagnostics
   */
  getDiagnostics(): Diagnostic[] {
    // Run final checks
    this.checkCardinality()
    this.checkSkippedNonJsonTypes()
    return [...this.diagnostics]
  }

  /**
   * Check skipped non-JSON types and add diagnostics
   */
  private checkSkippedNonJsonTypes(): void {
    for (const [jsType, data] of this.skippedNonJsonTypes.entries()) {
      const message =
        data.count === 1
          ? `Skipped non-JSON type '${jsType}' at path: ${data.examplePaths[0]}`
          : `Skipped non-JSON type '${jsType}' ${
              data.count
            } times (example paths: ${data.examplePaths.join(", ")})`

      this.addDiagnostic({
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
  }

  /**
   * Get statistics object
   */
  getStats(): ExtractionStats {
    return {
      nodeCount: this.nodeCount,
      observationCount: this.rowCount,
      maxDepth: this.maxDepthSeen,
    }
  }

  /**
   * Add a diagnostic (internal helper)
   */
  private addDiagnostic(diagnostic: Diagnostic): void {
    // Avoid duplicate diagnostics with same code and message
    const isDuplicate = this.diagnostics.some(
      (d) => d.code === diagnostic.code && d.message === diagnostic.message
    )
    if (!isDuplicate) {
      this.diagnostics.push(diagnostic)
    }
  }
}
