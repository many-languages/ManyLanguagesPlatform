import type {
  Diagnostic,
  ExtractionObservation,
  ExtractionStats,
  VariableFlag,
  VariableHeuristicThresholds,
  VariableType,
} from "../types"

/**
 * Diagnostic Engine - collects warnings and diagnostics during extraction
 * Tracks type drift, duplicates, cardinality issues, and other problems
 */
export class DiagnosticEngine {
  private stats = {
    nodeCount: 0,
    observationCount: 0,
    maxDepthSeen: 0,
  }

  private counts = {
    variableCounts: new Map<string, number>(),
    variableNullCounts: new Map<string, number>(),
    variableJsonParseFailures: new Map<string, number>(),
    variableUnserializableFallbacks: new Map<string, number>(),
  }

  private types = {
    variableTypes: new Map<string, Map<string, { count: number; examplePaths: string[] }>>(),
    variableObjectArrayLeaves: new Set<string>(),
  }

  private shapes = {
    variableLengths: new Map<string, { min?: number; max?: number }>(),
    variableHasMixedArrayElements: new Set<string>(),
  }

  private distinct = {
    strings: new Map<string, Set<string>>(),
    options: new Map<string, Set<string>>(),
  }

  private invariants = {
    variableKeyPathMap: new Map<string, string>(),
    variableKeyCollisionCounts: new Map<string, number>(),
    variableKeyCollisionKeyPaths: new Map<string, { first: string; second: string }>(),
    rowKeyIdAnomalyCounts: new Map<string, number>(),
    rowKeyIdAnomalyExamples: new Map<string, { rowKeyId: string; path: string }>(),
    observationKeys: new Set<string>(),
    duplicateObservationCounts: new Map<string, number>(),
    duplicateObservationExamples: new Map<
      string,
      { scopeKeyId: string; rowKeyId: string; path: string }
    >(),
  }

  private metrics = {
    variableRowAppearances: new Map<string, Set<string>>(),
  }

  private diagnostics = {
    run: [] as Diagnostic[],
    component: new Map<string, Diagnostic[]>(),
    skippedNonJsonTypes: new Map<string, { count: number; examplePaths: string[]; tag?: string }>(),
  }

  // Thresholds
  private readonly deepNestingThreshold: number = 8
  private readonly maxExamplePaths: number = 3
  private readonly maxObservations: number
  private readonly maxDistinctTracking: number = 100 // Cap for distinct counting

  constructor(maxObservations: number = 50000) {
    this.maxObservations = maxObservations
  }

  /**
   * Record an observation and record facts (not emit diagnostics)
   */
  recordObservation(obs: ExtractionObservation): void {
    this.stats.observationCount++
    const variableKey = obs.variableKey

    // Track variable count
    this.counts.variableCounts.set(
      variableKey,
      (this.counts.variableCounts.get(variableKey) || 0) + 1
    )

    // TYPE_DRIFT: Track variableTypes set, optionally store first example path(s)
    if (!this.types.variableTypes.has(variableKey)) {
      this.types.variableTypes.set(variableKey, new Map())
    }
    const typeMap = this.types.variableTypes.get(variableKey)!
    const existing = typeMap.get(obs.valueType)
    const currentCount = existing?.count || 0
    const isNewType = currentCount === 0 && typeMap.size > 0 // New type and we already had at least one type

    if (!existing) {
      typeMap.set(obs.valueType, { count: 1, examplePaths: [] })
    } else {
      existing.count++
    }

    if (isNewType) {
      // Record fact: multiple types detected, store example path
      const typeData = typeMap.get(obs.valueType)!
      if (typeData.examplePaths.length < this.maxExamplePaths) {
        typeData.examplePaths.push(obs.path)
      }
    }

    // Track null count
    if (obs.valueType === "null") {
      this.counts.variableNullCounts.set(
        variableKey,
        (this.counts.variableNullCounts.get(variableKey) || 0) + 1
      )
    }

    // Track object/array leaf types
    if (obs.valueType === "object" || obs.valueType === "array") {
      this.types.variableObjectArrayLeaves.add(variableKey)
    }

    // Track distinct (scopeKeyId, rowKeyId) pairs for this variable
    const scopeKeyId = this.buildScopeKeyId(obs.scopeKeys)
    const rowPairKey = `${scopeKeyId}||${obs.rowKeyId}`
    if (!this.metrics.variableRowAppearances.has(variableKey)) {
      this.metrics.variableRowAppearances.set(variableKey, new Set())
    }
    this.metrics.variableRowAppearances.get(variableKey)!.add(rowPairKey)

    // DUPLICATE_OBSERVATION: Increment counter, optionally store one example slot+path
    const observationKey = `${scopeKeyId}||${variableKey}||${obs.rowKeyId}`
    if (this.invariants.observationKeys.has(observationKey)) {
      // Record fact: duplicate detected
      this.invariants.duplicateObservationCounts.set(
        variableKey,
        (this.invariants.duplicateObservationCounts.get(variableKey) || 0) + 1
      )
      // Store first example if not already stored
      if (!this.invariants.duplicateObservationExamples.has(variableKey)) {
        this.invariants.duplicateObservationExamples.set(variableKey, {
          scopeKeyId,
          rowKeyId: obs.rowKeyId,
          path: obs.path,
        })
      }
    } else {
      this.invariants.observationKeys.add(observationKey)
    }

    // VARIABLE_KEY_COLLISION: Invariant counter + store both keyPaths
    const keyPathString = obs.keyPath.join(".")
    if (!this.invariants.variableKeyPathMap.has(variableKey)) {
      this.invariants.variableKeyPathMap.set(variableKey, keyPathString)
    } else {
      const firstKeyPathString = this.invariants.variableKeyPathMap.get(variableKey)!
      if (firstKeyPathString !== keyPathString) {
        // Record fact: collision detected
        this.invariants.variableKeyCollisionCounts.set(
          variableKey,
          (this.invariants.variableKeyCollisionCounts.get(variableKey) || 0) + 1
        )
        // Store both keyPaths if not already stored
        if (!this.invariants.variableKeyCollisionKeyPaths.has(variableKey)) {
          this.invariants.variableKeyCollisionKeyPaths.set(variableKey, {
            first: firstKeyPathString,
            second: keyPathString,
          })
        }
      }
    }

    // ROW_KEY_ID_ANOMALY: Counter keyed by variableKey (and maybe rowKeyId) + sample path
    const hasArrayIndices = obs.path.includes("[") && obs.path.includes("]")
    if (
      (obs.rowKeyId === "root" && hasArrayIndices) ||
      (obs.rowKeyId !== "root" && !hasArrayIndices)
    ) {
      // Record fact: anomaly detected
      this.invariants.rowKeyIdAnomalyCounts.set(
        variableKey,
        (this.invariants.rowKeyIdAnomalyCounts.get(variableKey) || 0) + 1
      )
      // Store first example if not already stored
      if (!this.invariants.rowKeyIdAnomalyExamples.has(variableKey)) {
        this.invariants.rowKeyIdAnomalyExamples.set(variableKey, {
          rowKeyId: obs.rowKeyId,
          path: obs.path,
        })
      }
    }

    // Track lengths for arrays and strings, and check for JSON parse failures
    if (obs.valueType === "array" || obs.valueType === "string") {
      try {
        const parsed = JSON.parse(obs.valueJson)
        const length = Array.isArray(parsed) ? parsed.length : String(parsed).length
        const current = this.shapes.variableLengths.get(variableKey) || {}
        this.shapes.variableLengths.set(variableKey, {
          min: current.min !== undefined ? Math.min(current.min, length) : length,
          max: current.max !== undefined ? Math.max(current.max, length) : length,
        })

        // Track distinct strings (capped)
        if (obs.valueType === "string") {
          if (!this.distinct.strings.has(variableKey)) {
            this.distinct.strings.set(variableKey, new Set())
          }
          const distinctSet = this.distinct.strings.get(variableKey)!
          if (distinctSet.size < this.maxDistinctTracking) {
            distinctSet.add(String(parsed))
          }
        } else if (obs.valueType === "array" && Array.isArray(parsed)) {
          // Check for array-of-string and track distinct options
          if (parsed.length > 0) {
            const firstType = typeof parsed[0]
            const allSameType = parsed.every((item) => typeof item === firstType)

            if (allSameType && firstType === "string") {
              // Array-of-string: track distinct options (capped)
              if (!this.distinct.options.has(variableKey)) {
                this.distinct.options.set(variableKey, new Set())
              }
              const distinctSet = this.distinct.options.get(variableKey)!
              if (distinctSet.size < this.maxDistinctTracking) {
                for (const item of parsed) {
                  if (typeof item === "string") {
                    distinctSet.add(item)
                    if (distinctSet.size >= this.maxDistinctTracking) {
                      break
                    }
                  }
                }
              }
            } else if (!allSameType) {
              // Array-of-primitives with mixed types
              this.shapes.variableHasMixedArrayElements.add(variableKey)
            }
          }
        }
      } catch (error) {
        // JSON parse failed - track it
        this.counts.variableJsonParseFailures.set(
          variableKey,
          (this.counts.variableJsonParseFailures.get(variableKey) || 0) + 1
        )
      }
    }

    // Check for safeStringify fallback usage
    if (obs.valueJson === '"[Circular]"' || obs.valueJson.startsWith('"[StringifyError:')) {
      this.counts.variableUnserializableFallbacks.set(
        variableKey,
        (this.counts.variableUnserializableFallbacks.get(variableKey) || 0) + 1
      )
    }
  }

  /**
   * Increment node count (called for each node visited during traversal)
   */
  incrementNodeCount(): void {
    this.stats.nodeCount++
  }

  /**
   * Update max depth seen
   */
  updateDepth(depth: number): void {
    if (depth > this.stats.maxDepthSeen) {
      this.stats.maxDepthSeen = depth
    }
  }

  /**
   * Check cardinality and add diagnostics if needed
   */
  checkCardinality(): void {
    // Check overall observation count (run-level only)
    if (this.stats.observationCount > this.maxObservations) {
      this.addDiagnostic({
        severity: "warning",
        code: "EXPLODING_CARDINALITY",
        level: "run",
        message: `Total observations (${this.stats.observationCount}) exceeds recommended limit`,
        metadata: {
          observationCount: this.stats.observationCount,
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
        level: "run",
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
      level: "run",
      message: `Maximum node count exceeded (${this.stats.nodeCount} nodes visited)`,
      metadata: {
        nodeCount: this.stats.nodeCount,
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
      level: "run",
      message: `Maximum observation count exceeded (${this.stats.observationCount} observations, limit: ${this.maxObservations})`,
      metadata: {
        observationCount: this.stats.observationCount,
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
      level: "run",
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
    const existing = this.diagnostics.skippedNonJsonTypes.get(jsType)
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
      this.diagnostics.skippedNonJsonTypes.set(jsType, {
        count: 1,
        examplePaths: [path],
        tag,
      })
    }
  }

  /**
   * Get all collected diagnostics (run-level only, for backward compatibility)
   */
  getDiagnostics(): Diagnostic[] {
    // Run final checks (only run-level)
    this.checkCardinality()
    this.checkSkippedNonJsonTypes()
    // Variable-level diagnostics materialized during aggregation from facts, not here

    // Return run-level diagnostics for backward compatibility
    return [...this.diagnostics.run]
  }

  /**
   * Check skipped non-JSON types and add diagnostics
   */
  private checkSkippedNonJsonTypes(): void {
    for (const [jsType, data] of this.diagnostics.skippedNonJsonTypes.entries()) {
      const message =
        data.count === 1
          ? `Skipped non-JSON type '${jsType}' at path: ${data.examplePaths[0]}`
          : `Skipped non-JSON type '${jsType}' ${
              data.count
            } times (example paths: ${data.examplePaths.join(", ")})`

      this.addDiagnostic({
        severity: "warning",
        code: "SKIPPED_NON_JSON_TYPE",
        level: "run",
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
      nodeCount: this.stats.nodeCount,
      observationCount: this.stats.observationCount,
      maxDepth: this.stats.maxDepthSeen,
    }
  }

  /**
   * Build stable scopeKeyId from all present ScopeKeys fields (sorted)
   * Format: "batchId:abc|componentId:123|groupId:xyz|workerId:456"
   * Fields are sorted alphabetically by key name for stability
   * Only includes fields that are present (not undefined)
   *
   * This design allows ScopeKeys to be extended in the future without breaking
   * existing functionality - new fields will automatically be included.
   */
  private buildScopeKeyId(scopeKeys: ExtractionObservation["scopeKeys"]): string {
    return Object.entries(scopeKeys)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${String(v)}`)
      .join("|")
  }

  /**
   * Add a diagnostic (internal helper) - only accepts run-level diagnostics
   */
  private addDiagnostic(diagnostic: Diagnostic): void {
    // Require level to be explicitly set
    if (!diagnostic.level) {
      throw new Error(
        "Diagnostic level must be explicitly set. Use addComponentDiagnostic() for component-level diagnostics."
      )
    }

    // Only accept run-level diagnostics
    if (diagnostic.level !== "run") {
      throw new Error(
        `addDiagnostic() only accepts run-level diagnostics. Got level: ${diagnostic.level}`
      )
    }

    // Check for duplicates
    const isDuplicate = this.diagnostics.run.some(
      (d) => d.code === diagnostic.code && d.message === diagnostic.message
    )
    if (!isDuplicate) {
      this.diagnostics.run.push(diagnostic)
    }
  }

  /**
   * Add a component-level diagnostic
   */
  addComponentDiagnostic(componentId: string, diagnostic: Diagnostic): void {
    // Require level to be explicitly set
    if (!diagnostic.level) {
      throw new Error("Diagnostic level must be explicitly set to 'component'")
    }

    // Ensure it's component level
    if (diagnostic.level !== "component") {
      throw new Error(
        `addComponentDiagnostic() only accepts component-level diagnostics. Got level: ${diagnostic.level}`
      )
    }

    // Store by componentId
    const componentIdStr = String(componentId)
    if (!this.diagnostics.component.has(componentIdStr)) {
      this.diagnostics.component.set(componentIdStr, [])
    }

    // Check for duplicates
    const existing = this.diagnostics.component.get(componentIdStr)!
    const isDuplicate = existing.some(
      (d) => d.code === diagnostic.code && d.message === diagnostic.message
    )
    if (!isDuplicate) {
      existing.push(diagnostic)
    }
  }

  /**
   * Get diagnostics by level
   */
  getDiagnosticsByLevel(): {
    component: Map<string, Diagnostic[]>
    run: Diagnostic[]
  } {
    return {
      component: new Map(this.diagnostics.component),
      run: [...this.diagnostics.run],
    }
  }

  /**
   * Expose collected facts/counts/metrics for aggregation
   * Returns direct references (read-only) - do not mutate these structures
   */
  getVariableFacts() {
    return {
      counts: this.counts,
      types: this.types,
      shapes: this.shapes,
      distinct: this.distinct,
      invariants: {
        duplicates: {
          duplicateObservationCounts: this.invariants.duplicateObservationCounts,
          duplicateObservationExamples: this.invariants.duplicateObservationExamples,
        },
        collisions: {
          variableKeyCollisionCounts: this.invariants.variableKeyCollisionCounts,
          variableKeyCollisionKeyPaths: this.invariants.variableKeyCollisionKeyPaths,
        },
        rowKeyAnomalies: {
          rowKeyIdAnomalyCounts: this.invariants.rowKeyIdAnomalyCounts,
          rowKeyIdAnomalyExamples: this.invariants.rowKeyIdAnomalyExamples,
        },
      },
      metrics: this.metrics,
    }
  }

  /**
   * Check if extraction was truncated
   */
  wasTruncated(): boolean {
    return this.diagnostics.run.some(
      (d) =>
        d.code === "MAX_NODES_EXCEEDED" ||
        d.code === "MAX_OBSERVATIONS_EXCEEDED" ||
        d.code === "MAX_DEPTH_EXCEEDED"
    )
  }
}

/**
 * Get non-null types from a type map (filters out null and zero counts)
 */
function getNonNullTypes(
  typeMap?: Map<string, { count: number; examplePaths: string[] }>
): Array<[string, number]> {
  if (!typeMap) return []
  return Array.from(typeMap.entries())
    .filter(([type, data]) => type !== "null" && data.count > 0)
    .map(([type, data]) => [type, data.count] as [string, number])
}

/**
 * Materialize variable-level diagnostics from facts
 */
export function materializeVariableDiagnostics(
  variableKey: string,
  facts: ReturnType<DiagnosticEngine["getVariableFacts"]>,
  variableType: VariableType,
  thresholds: VariableHeuristicThresholds
): Diagnostic[] {
  const diagnostics: Diagnostic[] = []

  // TYPE_DRIFT: Materialize from variableTypes (filter out null)
  const typeMap = facts.types.variableTypes.get(variableKey)
  const nonNullTypes = getNonNullTypes(typeMap)

  if (nonNullTypes.length > 1) {
    const types = nonNullTypes.map(([type, count]) => `${type}(${count})`).join(", ")
    // Collect example paths from all types (up to 3 total)
    const allExamplePaths: string[] = []
    if (typeMap) {
      for (const [type, data] of typeMap.entries()) {
        if (type !== "null" && data.count > 0) {
          allExamplePaths.push(...data.examplePaths)
          if (allExamplePaths.length >= 3) {
            break
          }
        }
      }
    }
    diagnostics.push({
      severity: "warning",
      code: "TYPE_DRIFT",
      level: "variable",
      message: `Variable '${variableKey}' has multiple types: ${types}`,
      metadata: {
        variable: variableKey,
        types: Object.fromEntries(nonNullTypes),
        ...(allExamplePaths.length > 0 && { examplePaths: allExamplePaths.slice(0, 3) }),
      },
    })
  }

  // DUPLICATE_OBSERVATION: Materialize from counter
  const duplicateCount =
    facts.invariants.duplicates.duplicateObservationCounts.get(variableKey) || 0
  if (duplicateCount > 0) {
    const example = facts.invariants.duplicates.duplicateObservationExamples.get(variableKey)
    diagnostics.push({
      severity: "warning",
      code: "DUPLICATE_OBSERVATION",
      level: "variable",
      message: `Variable '${variableKey}' has ${duplicateCount} duplicate observation${
        duplicateCount === 1 ? "" : "s"
      }`,
      metadata: {
        variable: variableKey,
        count: duplicateCount,
        ...(example && { example }),
      },
    })
  }

  // VARIABLE_KEY_COLLISION: Materialize from counter + keyPaths
  const collisionCount =
    facts.invariants.collisions.variableKeyCollisionCounts.get(variableKey) || 0
  if (collisionCount > 0) {
    const keyPaths = facts.invariants.collisions.variableKeyCollisionKeyPaths.get(variableKey)
    diagnostics.push({
      severity: "warning",
      code: "VARIABLE_KEY_COLLISION",
      level: "variable",
      message: `VariableKey '${variableKey}' maps to different keyPaths: '${keyPaths?.first}' vs '${keyPaths?.second}'`,
      metadata: {
        variable: variableKey,
        firstKeyPathString: keyPaths?.first,
        currentKeyPathString: keyPaths?.second,
        count: collisionCount,
      },
    })
  }

  // ROW_KEY_ID_ANOMALY: Materialize from counter + example
  const anomalyCount = facts.invariants.rowKeyAnomalies.rowKeyIdAnomalyCounts.get(variableKey) || 0
  if (anomalyCount > 0) {
    const example = facts.invariants.rowKeyAnomalies.rowKeyIdAnomalyExamples.get(variableKey)
    diagnostics.push({
      severity: "warning",
      code: "ROW_KEY_ID_ANOMALY",
      level: "variable",
      message: `Variable '${variableKey}' has ${anomalyCount} rowKeyId anomaly${
        anomalyCount === 1 ? "" : "s"
      }`,
      metadata: {
        variable: variableKey,
        count: anomalyCount,
        ...(example && { example }),
      },
    })
  }

  // Get counts once for reuse
  const totalCount = facts.counts.variableCounts.get(variableKey) || 0
  const nullCount = facts.counts.variableNullCounts.get(variableKey) || 0
  const observationCount = totalCount // Alias for clarity

  // HIGH_NULL_RATE: Compute from counts (uses highNullRate threshold)
  if (totalCount > 0) {
    const nullRate = nullCount / totalCount
    if (nullRate > thresholds.highNullRate) {
      diagnostics.push({
        severity: "warning",
        code: "HIGH_NULL_RATE",
        level: "variable",
        message: `Variable '${variableKey}' has high null rate: ${(nullRate * 100).toFixed(
          1
        )}% (${nullCount}/${totalCount})`,
        metadata: {
          variable: variableKey,
          nullRate,
          nullCount,
          totalCount,
          threshold: thresholds.highNullRate,
        },
      })
    }
  }

  // VALUE_JSON_PARSE_FAILED: Compute from counts
  const parseFailures = facts.counts.variableJsonParseFailures.get(variableKey) || 0
  if (parseFailures > 0) {
    diagnostics.push({
      severity: "warning",
      code: "VALUE_JSON_PARSE_FAILED",
      level: "variable",
      message: `Variable '${variableKey}' has ${parseFailures} valueJson parse failure${
        parseFailures === 1 ? "" : "s"
      }`,
      metadata: {
        variable: variableKey,
        count: parseFailures,
      },
    })
  }

  // VALUE_JSON_UNSERIALIZABLE_FALLBACK_USED: Compute from counts
  const fallbackCount = facts.counts.variableUnserializableFallbacks.get(variableKey) || 0
  if (fallbackCount > 0) {
    diagnostics.push({
      severity: "warning",
      code: "VALUE_JSON_UNSERIALIZABLE_FALLBACK_USED",
      level: "variable",
      message: `Variable '${variableKey}' has ${fallbackCount} unserializable value${
        fallbackCount === 1 ? "" : "s"
      } (fallback used)`,
      metadata: {
        variable: variableKey,
        count: fallbackCount,
      },
    })
  }

  // UNEXPECTED_OBJECT_ARRAY_LEAF: Compute from set
  if (facts.types.variableObjectArrayLeaves.has(variableKey)) {
    diagnostics.push({
      severity: "warning",
      code: "UNEXPECTED_OBJECT_ARRAY_LEAF",
      level: "variable",
      message: `Variable '${variableKey}' has valueType object or array (unexpected leaf type)`,
      metadata: {
        variable: variableKey,
      },
    })
  }

  // MANY_NULLS: Compute from counts at thresholds.manyNulls
  if (totalCount > 0) {
    const nullRate = nullCount / totalCount
    if (nullRate >= thresholds.manyNulls) {
      diagnostics.push({
        severity: "warning",
        code: "MANY_NULLS",
        level: "variable",
        message: `Variable '${variableKey}' has many nulls: ${(nullRate * 100).toFixed(
          1
        )}% (${nullCount}/${totalCount})`,
        metadata: {
          variable: variableKey,
          nullRate,
          nullCount,
          totalCount,
          threshold: thresholds.manyNulls,
        },
      })
    }
  }

  // MIXED_ARRAY_ELEMENT_TYPES: From facts.shapes.variableHasMixedArrayElements
  if (facts.shapes.variableHasMixedArrayElements.has(variableKey)) {
    diagnostics.push({
      severity: "warning",
      code: "MIXED_ARRAY_ELEMENT_TYPES",
      level: "variable",
      message: `Variable '${variableKey}' has array elements with mixed types`,
      metadata: {
        variable: variableKey,
      },
    })
  }

  // HIGH_OCCURRENCE: From counts.variableCounts
  if (observationCount > thresholds.highOccurrence) {
    diagnostics.push({
      severity: "warning",
      code: "HIGH_OCCURRENCE",
      level: "variable",
      message: `Variable '${variableKey}' has high occurrence count: ${observationCount} (threshold: ${thresholds.highOccurrence})`,
      metadata: {
        variable: variableKey,
        observationCount,
        threshold: thresholds.highOccurrence,
      },
    })
  }

  // HIGH_CARDINALITY: From distinct.strings/options
  if (variableType === "string") {
    const distinctStringCount = facts.distinct.strings.get(variableKey)?.size || 0
    if (distinctStringCount >= thresholds.highCardinality) {
      diagnostics.push({
        severity: "warning",
        code: "HIGH_CARDINALITY",
        level: "variable",
        message: `Variable '${variableKey}' has high cardinality: ${distinctStringCount} distinct values (threshold: ${thresholds.highCardinality})`,
        metadata: {
          variable: variableKey,
          distinctCount: distinctStringCount,
          threshold: thresholds.highCardinality,
        },
      })
    }
  } else if (variableType === "array") {
    const distinctOptionCount = facts.distinct.options.get(variableKey)?.size || 0
    if (distinctOptionCount >= thresholds.highCardinality) {
      diagnostics.push({
        severity: "warning",
        code: "HIGH_CARDINALITY",
        level: "variable",
        message: `Variable '${variableKey}' has high cardinality: ${distinctOptionCount} distinct options (threshold: ${thresholds.highCardinality})`,
        metadata: {
          variable: variableKey,
          distinctCount: distinctOptionCount,
          threshold: thresholds.highCardinality,
        },
      })
    }
  }

  // LARGE_VALUES: From shapes.variableLengths.max
  const lengths = facts.shapes.variableLengths.get(variableKey)
  if (lengths?.max !== undefined && lengths.max > thresholds.largeValueLength) {
    diagnostics.push({
      severity: "warning",
      code: "LARGE_VALUES",
      level: "variable",
      message: `Variable '${variableKey}' has large values: max length ${lengths.max} (threshold: ${thresholds.largeValueLength})`,
      metadata: {
        variable: variableKey,
        maxLength: lengths.max,
        threshold: thresholds.largeValueLength,
      },
    })
  }

  return diagnostics
}

/**
 * Map diagnostic codes to variable flags for quick filtering
 */
const DIAGNOSTIC_CODE_TO_FLAG: Partial<Record<string, VariableFlag>> = {
  TYPE_DRIFT: "TYPE_DRIFT",
  MANY_NULLS: "MANY_NULLS",
  MIXED_ARRAY_ELEMENT_TYPES: "MIXED_ARRAY_ELEMENT_TYPES",
  HIGH_OCCURRENCE: "HIGH_OCCURRENCE",
  HIGH_CARDINALITY: "HIGH_CARDINALITY",
  LARGE_VALUES: "LARGE_VALUES",
}

/**
 * Derive variable flags from diagnostics (projection for quick filtering)
 * Flags are a lightweight projection of diagnostics - no duplicate logic
 */
export function deriveVariableFlags(diagnostics: Diagnostic[]): VariableFlag[] {
  const flags: VariableFlag[] = []
  const seenFlags = new Set<VariableFlag>()

  for (const diagnostic of diagnostics) {
    const flag = DIAGNOSTIC_CODE_TO_FLAG[diagnostic.code]
    if (flag && !seenFlags.has(flag)) {
      flags.push(flag)
      seenFlags.add(flag)
    }
  }

  return flags
}
