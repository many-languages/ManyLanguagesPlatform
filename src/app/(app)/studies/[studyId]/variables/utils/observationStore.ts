import type { ExtractionObservation } from "../types"

/**
 * Observation Store - provides efficient lookup of observations by variableKey, scope, and row
 *
 * Uses indices into the allObservations array to avoid duplicating observation data.
 * This follows the normalized data pattern where:
 * - Variables are lightweight aggregates
 * - Observations contain full detail
 * - variableKey acts as the foreign key relationship
 *
 * Design decisions:
 * - Stores indices (number[]) instead of observation arrays to save memory
 * - Returns iterators instead of arrays to avoid allocation overhead
 * - Returns valueJson strings (caller parses) to avoid repeated parsing
 * - Uses variableKey: string directly (store is ignorant of ExtractedVariable aggregates)
 * - Provides row/scoped helpers for accessing observations by execution context
 * - Uses pre-computed scopeKeyId from observations (no need to recompute from scopeKeys)
 */
export class ObservationStore {
  private readonly allObservations: ReadonlyArray<ExtractionObservation>
  private readonly byVariableKey: Map<string, number[]>
  private readonly byScopeAndRow: Map<string, number[]>

  constructor(observations: ExtractionObservation[]) {
    // Create a shallow copy and freeze in development to prevent mutations
    const observationsCopy = [...observations]
    if (process.env.NODE_ENV === "development") {
      Object.freeze(observationsCopy)
      // Also freeze each observation object
      observationsCopy.forEach((obs) => Object.freeze(obs))
    }
    this.allObservations = observationsCopy
    this.byVariableKey = new Map()
    this.byScopeAndRow = new Map()

    // Index observations by variableKey (the stable foreign key)
    for (let i = 0; i < observationsCopy.length; i++) {
      const obs = observationsCopy[i]

      // Index by variableKey
      if (!this.byVariableKey.has(obs.variableKey)) {
        this.byVariableKey.set(obs.variableKey, [])
      }
      this.byVariableKey.get(obs.variableKey)!.push(i)

      // Index by scope and row for iterateRow() lookups
      // Key format: "${scopeKeyId}||${rowKeyId}"
      // Use pre-computed scopeKeyId from observation (no need to recompute)
      const joinKey = `${obs.scopeKeyId}||${obs.rowKeyId}`
      if (!this.byScopeAndRow.has(joinKey)) {
        this.byScopeAndRow.set(joinKey, [])
      }
      this.byScopeAndRow.get(joinKey)!.push(i)
    }
  }

  /**
   * Get observation indices for a variable by its variableKey
   * This is the primary lookup method - similar to a JOIN query
   */
  getObservationIndicesByVariableKey(variableKey: string): number[] {
    return this.byVariableKey.get(variableKey) || []
  }

  /**
   * Iterate observations for a variable by its variableKey
   * Returns an iterator to avoid array allocation - use for efficient processing
   *
   * Example:
   * ```typescript
   * for (const obs of store.iterateObservationsByVariableKey("$.rt")) {
   *   console.log(obs.valueJson)
   * }
   * ```
   */
  *iterateObservationsByVariableKey(
    variableKey: string
  ): Generator<ExtractionObservation, void, unknown> {
    const indices = this.getObservationIndicesByVariableKey(variableKey)
    for (const i of indices) {
      yield this.allObservations[i]
    }
  }

  /**
   * Iterate valueJson strings for a variable (caller parses)
   * Returns an iterator to avoid array allocation
   * Use this when you need the values (e.g., for feedback/debug)
   *
   * Example:
   * ```typescript
   * for (const valueJson of store.iterateValueJsonByVariableKey("$.rt")) {
   *   const value = JSON.parse(valueJson)
   *   // process value
   * }
   * ```
   */
  *iterateValueJsonByVariableKey(variableKey: string): Generator<string, void, unknown> {
    const indices = this.getObservationIndicesByVariableKey(variableKey)
    for (const i of indices) {
      yield this.allObservations[i].valueJson
    }
  }

  /**
   * Iterate observations for a specific row within a scope
   * Returns an iterator to avoid array allocation
   * Useful for accessing all observations that belong to the same array instance
   *
   * @param scopeKeyId - Pre-computed scope key ID (from observation.scopeKeyId)
   * @param rowKeyId - The row key ID (e.g., "trials[*]#0|trials[*].responses[*]#2" or "root" for non-array values)
   *
   * Example:
   * ```typescript
   * for (const obs of store.iterateRow(scopeKeyId, rowKeyId)) {
   *   console.log(obs.variableKey, obs.valueJson)
   * }
   * ```
   */
  *iterateRow(
    scopeKeyId: string,
    rowKeyId: string
  ): Generator<ExtractionObservation, void, unknown> {
    const joinKey = `${scopeKeyId}||${rowKeyId}`
    const indices = this.byScopeAndRow.get(joinKey) || []
    for (const i of indices) {
      yield this.allObservations[i]
    }
  }

  private readonly warnedDuplicateRowKeys = new Set<string>()

  private warnDuplicateOnce(opts: {
    scopeKeyId: string
    rowKeyId: string
    variableKey: string
    paths: string[]
  }) {
    if (process.env.NODE_ENV === "production") return

    const dedupeKey = `${opts.scopeKeyId}::${opts.rowKeyId}::${opts.variableKey}`
    if (this.warnedDuplicateRowKeys.has(dedupeKey)) return
    this.warnedDuplicateRowKeys.add(dedupeKey)

    console.warn(
      `[ObservationStore] Duplicate variableKey in row; using last-write-wins. ` +
        `variableKey="${opts.variableKey}", scopeKeyId="${opts.scopeKeyId}", rowKeyId="${opts.rowKeyId}", ` +
        `paths=${JSON.stringify(opts.paths)}`
    )
  }

  private parseValueJson(valueJson: string): unknown {
    try {
      return JSON.parse(valueJson)
    } catch {
      return null
    }
  }

  /**
   * Ergonomic: Record<string, unknown> for one (scopeKeyId, rowKeyId).
   * Behavior: last-write-wins on duplicates, and warns (dev-only).
   */
  getRowRecord(scopeKeyId: string, rowKeyId: string): Record<string, unknown> {
    return this.getRowRecordLastWriteWins(scopeKeyId, rowKeyId, { warnOnDuplicates: true })
  }

  /**
   * Explicit last-write-wins version (optionally warns).
   * This is the best "default" for app logic/conditionals.
   */
  getRowRecordLastWriteWins(
    scopeKeyId: string,
    rowKeyId: string,
    options?: { warnOnDuplicates?: boolean }
  ): Record<string, unknown> {
    const record: Record<string, unknown> = {}

    // Track duplicates (only if we might warn)
    const seen = options?.warnOnDuplicates ? new Map<string, string[]>() : null

    for (const obs of this.iterateRow(scopeKeyId, rowKeyId)) {
      if (seen) {
        const paths = seen.get(obs.variableKey) ?? []
        paths.push(obs.path)
        seen.set(obs.variableKey, paths)

        // Warn only when we see the *second* occurrence
        if (paths.length === 2) {
          this.warnDuplicateOnce({
            scopeKeyId,
            rowKeyId,
            variableKey: obs.variableKey,
            paths,
          })
        }
      }

      record[obs.variableKey] = this.parseValueJson(obs.valueJson)
    }

    return record
  }

  /**
   * Safer alternative: preserves *all* values for duplicates.
   * Result: Record<variableKey, unknown[]>
   */
  getRowRecordMulti(scopeKeyId: string, rowKeyId: string): Record<string, unknown[]> {
    const record: Record<string, unknown[]> = {}

    for (const obs of this.iterateRow(scopeKeyId, rowKeyId)) {
      const v = this.parseValueJson(obs.valueJson)
      ;(record[obs.variableKey] ??= []).push(v)
    }

    return record
  }

  /**
   * Get observation count for a variable
   */
  getObservationCount(variableKey: string): number {
    return this.getObservationIndicesByVariableKey(variableKey).length
  }

  /**
   * Check if store has observations for a variable
   */
  hasObservations(variableKey: string): boolean {
    return this.byVariableKey.has(variableKey)
  }

  /**
   * Get all observations (for cases where you need the full dataset)
   * Returns a copy to prevent accidental mutations
   */
  getAllObservations(): ExtractionObservation[] {
    return [...this.allObservations]
  }

  /**
   * Get observation by index (for direct access)
   * Returns the observation directly (caller should not mutate)
   */
  getObservationByIndex(index: number): ExtractionObservation | undefined {
    return this.allObservations[index]
  }

  /**
   * Get total observation count
   */
  getTotalCount(): number {
    return this.allObservations.length
  }
}

/**
 * Helper function to create a store from observations
 */
export function createObservationStore(observations: ExtractionObservation[]): ObservationStore {
  return new ObservationStore(observations)
}
