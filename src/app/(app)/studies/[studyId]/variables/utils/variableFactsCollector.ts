import { ExtractionObservation, VariableFacts } from "../types"

/**
 * VariableFactsCollector - mutable collector for variable facts during extraction
 * Lightweight: only records observations, no snapshotting logic
 * Used during walk() to collect facts incrementally
 */
export class VariableFactsCollector {
  private readonly maxExamplePaths: number
  private readonly maxDistinctTracking: number

  readonly facts: VariableFacts = {
    counts: {
      variableCounts: new Map(),
      variableNullCounts: new Map(),
      variableUnserializableFallbacks: new Map(),
    },
    types: {
      variableTypes: new Map(),
      variableObjectArrayLeaves: new Set(),
    },
    shapes: {
      variableLengths: new Map(),
      variableHasMixedArrayElements: new Set(),
    },
    distinct: {
      strings: new Map(),
      options: new Map(),
    },
    invariants: {
      duplicates: {
        observationKeys: new Map(), // Map<variableKey, Map<scopeKeyId, Set<rowKeyId>>>
        duplicateObservationCounts: new Map(),
        duplicateObservationExamples: new Map(),
      },
      collisions: {
        variableKeyPathMap: new Map(),
        variableKeyPathCounts: new Map(),
        variableKeyCollisionCounts: new Map(),
        variableKeyCollisionKeyPaths: new Map(),
      },
      rowKeyAnomalies: {
        rowKeyIdAnomalyCounts: new Map(),
        rowKeyIdAnomalyExamples: new Map(),
      },
    },
  }

  constructor(opts: { maxExamplePaths: number; maxDistinctTracking: number }) {
    this.maxExamplePaths = opts.maxExamplePaths
    this.maxDistinctTracking = opts.maxDistinctTracking
  }

  /**
   * Record an observation - delegates to specific fact recorders
   */
  record(obs: ExtractionObservation): void {
    this.recordCounts(obs)
    this.recordTypes(obs)
    this.recordShapes(obs)
    this.recordDistinct(obs)
    this.recordInvariants(obs)
  }

  // ----------------------------
  // Specific fact recorders
  // ----------------------------

  private recordCounts(obs: ExtractionObservation): void {
    const variableKey = obs.variableKey

    // Increment total count
    this.facts.counts.variableCounts.set(
      variableKey,
      (this.facts.counts.variableCounts.get(variableKey) || 0) + 1
    )

    // Null count
    if (obs.valueType === "null") {
      this.facts.counts.variableNullCounts.set(
        variableKey,
        (this.facts.counts.variableNullCounts.get(variableKey) || 0) + 1
      )
    }

    // Stringify errors (from diagnostic metadata)
    if (obs.diagnosticMetadata?.stringifyError) {
      this.facts.counts.variableUnserializableFallbacks.set(
        variableKey,
        (this.facts.counts.variableUnserializableFallbacks.get(variableKey) || 0) + 1
      )
    }
  }

  private recordTypes(obs: ExtractionObservation): void {
    const variableKey = obs.variableKey

    // Initialize type map if needed
    if (!this.facts.types.variableTypes.has(variableKey)) {
      this.facts.types.variableTypes.set(variableKey, new Map())
    }

    const typeMap = this.facts.types.variableTypes.get(variableKey)!
    const existing = typeMap.get(obs.valueType)
    const isNewType = !existing && typeMap.size > 0

    if (!existing) {
      typeMap.set(obs.valueType, { count: 1, examplePaths: [] })
    } else {
      existing.count++
    }

    // Track new type examples
    if (isNewType) {
      const typeData = typeMap.get(obs.valueType)!
      if (typeData.examplePaths.length < this.maxExamplePaths) {
        typeData.examplePaths.push(obs.path)
      }
    }

    // Object/array leaf tracking
    if (obs.valueType === "object" || obs.valueType === "array") {
      this.facts.types.variableObjectArrayLeaves.add(variableKey)
    }
  }

  private recordShapes(obs: ExtractionObservation): void {
    const variableKey = obs.variableKey

    // Only process arrays and strings
    if (obs.valueType !== "array" && obs.valueType !== "string") {
      return
    }

    if (!obs.diagnosticMetadata) {
      // Metadata should always be available for string/array types
      // If it's missing, it's a bug - but we'll just skip shape tracking for this observation
      return
    }

    const { length, arrayElementInfo } = obs.diagnosticMetadata

    // Track lengths (no parsing needed!)
    const current = this.facts.shapes.variableLengths.get(variableKey) || {}
    this.facts.shapes.variableLengths.set(variableKey, {
      min: current.min !== undefined ? Math.min(current.min, length) : length,
      max: current.max !== undefined ? Math.max(current.max, length) : length,
    })

    // Track mixed array elements (no parsing needed!)
    if (obs.valueType === "array" && arrayElementInfo?.kind === "mixed") {
      this.facts.shapes.variableHasMixedArrayElements.add(variableKey)
    }
  }

  private recordDistinct(obs: ExtractionObservation): void {
    const variableKey = obs.variableKey

    // Only process arrays and strings
    if (obs.valueType !== "array" && obs.valueType !== "string") {
      return
    }

    if (!obs.diagnosticMetadata) {
      return
    }

    const { stringValue, arrayStringValues } = obs.diagnosticMetadata

    // Track distinct strings (no parsing needed!)
    if (obs.valueType === "string" && stringValue !== undefined) {
      if (!this.facts.distinct.strings.has(variableKey)) {
        this.facts.distinct.strings.set(variableKey, new Set())
      }
      const s = this.facts.distinct.strings.get(variableKey)!
      if (s.size < this.maxDistinctTracking) {
        s.add(stringValue)
      }
    }

    // Track distinct options for string arrays (no parsing needed!)
    if (obs.valueType === "array" && arrayStringValues !== undefined) {
      if (!this.facts.distinct.options.has(variableKey)) {
        this.facts.distinct.options.set(variableKey, new Set())
      }
      const opts = this.facts.distinct.options.get(variableKey)!
      if (opts.size < this.maxDistinctTracking) {
        for (const item of arrayStringValues) {
          opts.add(item)
          if (opts.size >= this.maxDistinctTracking) break
        }
      }
    }
  }

  private recordInvariants(obs: ExtractionObservation): void {
    const variableKey = obs.variableKey
    const scopeKeyId = obs.scopeKeyId
    const rowKeyId = obs.rowKeyId

    // Get or create nested structure: Map<variableKey, Map<scopeKeyId, Set<rowKeyId>>>
    let scopeMap = this.facts.invariants.duplicates.observationKeys.get(variableKey)
    if (!scopeMap) {
      scopeMap = new Map()
      this.facts.invariants.duplicates.observationKeys.set(variableKey, scopeMap)
    }

    let rowKeySet = scopeMap.get(scopeKeyId)
    if (!rowKeySet) {
      rowKeySet = new Set()
      scopeMap.set(scopeKeyId, rowKeySet)
    }

    // Duplicates - check if we've seen this rowKeyId for this variableKey+scopeKeyId combination
    if (rowKeySet.has(rowKeyId)) {
      // Duplicate found
      this.facts.invariants.duplicates.duplicateObservationCounts.set(
        variableKey,
        (this.facts.invariants.duplicates.duplicateObservationCounts.get(variableKey) || 0) + 1
      )
      if (!this.facts.invariants.duplicates.duplicateObservationExamples.has(variableKey)) {
        this.facts.invariants.duplicates.duplicateObservationExamples.set(variableKey, {
          scopeKeyId: obs.scopeKeyId,
          rowKeyId: obs.rowKeyId,
          path: obs.path,
        })
      }
    } else {
      rowKeySet.add(rowKeyId)
    }

    // Collisions - use pre-computed keyPathString
    const first = this.facts.invariants.collisions.variableKeyPathMap.get(variableKey)
    if (!first) {
      this.facts.invariants.collisions.variableKeyPathMap.set(variableKey, obs.keyPathString)
    } else if (first !== obs.keyPathString) {
      this.facts.invariants.collisions.variableKeyCollisionCounts.set(
        variableKey,
        (this.facts.invariants.collisions.variableKeyCollisionCounts.get(variableKey) || 0) + 1
      )
      if (!this.facts.invariants.collisions.variableKeyCollisionKeyPaths.has(variableKey)) {
        this.facts.invariants.collisions.variableKeyCollisionKeyPaths.set(variableKey, {
          first,
          second: obs.keyPathString,
        })
      }
    }

    // Track keyPathString counts for collision aggregation
    let pathCounts = this.facts.invariants.collisions.variableKeyPathCounts.get(variableKey)
    if (!pathCounts) {
      pathCounts = new Map()
      this.facts.invariants.collisions.variableKeyPathCounts.set(variableKey, pathCounts)
    }
    pathCounts.set(obs.keyPathString, (pathCounts.get(obs.keyPathString) || 0) + 1)

    // Row key anomalies - use pre-computed hasArrayIndices
    if (
      (obs.rowKeyId === "root" && obs.hasArrayIndices) ||
      (obs.rowKeyId !== "root" && !obs.hasArrayIndices)
    ) {
      this.facts.invariants.rowKeyAnomalies.rowKeyIdAnomalyCounts.set(
        variableKey,
        (this.facts.invariants.rowKeyAnomalies.rowKeyIdAnomalyCounts.get(variableKey) || 0) + 1
      )
      if (!this.facts.invariants.rowKeyAnomalies.rowKeyIdAnomalyExamples.has(variableKey)) {
        this.facts.invariants.rowKeyAnomalies.rowKeyIdAnomalyExamples.set(variableKey, {
          rowKeyId: obs.rowKeyId,
          path: obs.path,
        })
      }
    }
  }
}
