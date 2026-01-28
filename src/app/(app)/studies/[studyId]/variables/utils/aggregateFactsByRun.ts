import type {
  ComponentFacts,
  ComponentFactsEntry,
  RunFacts,
  RunLimitEvent,
  ValueType,
  VariableFacts,
} from "../types"

type FactsByRun<T> = Map<number, T>

function createEmptyVariableFacts(): VariableFacts {
  return {
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
        observationKeys: new Map(),
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
}

export function aggregateRunFactsByRun(
  factsByRun: FactsByRun<RunFacts>,
  opts?: { maxExamplePaths?: number }
): RunFacts {
  const maxExamplePaths = opts?.maxExamplePaths ?? Infinity
  const limits = new Map<RunLimitEvent["kind"], RunLimitEvent>()
  let threshold = 0
  let maxDepth = 0
  const skippedNonJson = new Map<string, { count: number; examplePaths: string[]; tag?: string }>()

  for (const facts of factsByRun.values()) {
    for (const [kind, event] of facts.limits.entries()) {
      if (!limits.has(kind)) limits.set(kind, event)
    }

    if (!threshold) threshold = facts.deepNesting.threshold
    if (facts.deepNesting.maxDepth > maxDepth) maxDepth = facts.deepNesting.maxDepth

    for (const [jsType, data] of facts.skippedNonJson.entries()) {
      const existing = skippedNonJson.get(jsType)
      if (!existing) {
        skippedNonJson.set(jsType, {
          count: data.count,
          examplePaths: data.examplePaths.slice(0, maxExamplePaths),
          tag: data.tag,
        })
        continue
      }

      existing.count += data.count
      if (!existing.tag && data.tag) existing.tag = data.tag
      for (const p of data.examplePaths) {
        if (existing.examplePaths.length >= maxExamplePaths) break
        existing.examplePaths.push(p)
      }
    }
  }

  return {
    limits,
    deepNesting: { threshold, maxDepth },
    skippedNonJson,
  }
}

export function aggregateComponentFactsByRun(
  factsByRun: FactsByRun<ComponentFacts>
): ComponentFacts {
  const aggregated = new Map<number, ComponentFactsEntry>()

  for (const facts of factsByRun.values()) {
    for (const [componentId, entry] of facts.entries()) {
      const existing = aggregated.get(componentId)
      if (!existing) {
        aggregated.set(componentId, { ...entry })
        continue
      }

      existing.hasParsedData = existing.hasParsedData || entry.hasParsedData
      existing.hasDataContent = existing.hasDataContent || entry.hasDataContent

      if (!existing.detectedFormat && entry.detectedFormat) {
        existing.detectedFormat = entry.detectedFormat
      }

      if (!existing.parseError && entry.parseError) {
        existing.parseError = entry.parseError
      }

      if (!existing.formatError && entry.formatError) {
        existing.formatError = { ...entry.formatError }
      }
    }
  }

  return aggregated
}

export function aggregateVariableFactsByRun(
  factsByRun: FactsByRun<VariableFacts>,
  opts: { maxExamplePaths: number; maxDistinctTracking: number }
): VariableFacts {
  const aggregated = createEmptyVariableFacts()
  const { maxExamplePaths, maxDistinctTracking } = opts

  const addCount = (map: Map<string, number>, key: string, delta: number) => {
    map.set(key, (map.get(key) || 0) + delta)
  }

  for (const facts of factsByRun.values()) {
    // Counts
    for (const [key, count] of facts.counts.variableCounts.entries()) {
      addCount(aggregated.counts.variableCounts, key, count)
    }
    for (const [key, count] of facts.counts.variableNullCounts.entries()) {
      addCount(aggregated.counts.variableNullCounts, key, count)
    }
    for (const [key, count] of facts.counts.variableUnserializableFallbacks.entries()) {
      addCount(aggregated.counts.variableUnserializableFallbacks, key, count)
    }

    // Types
    for (const [variableKey, typeMap] of facts.types.variableTypes.entries()) {
      let aggTypeMap = aggregated.types.variableTypes.get(variableKey)
      if (!aggTypeMap) {
        aggTypeMap = new Map<ValueType, { count: number; examplePaths: string[] }>()
        aggregated.types.variableTypes.set(variableKey, aggTypeMap)
      }

      for (const [type, data] of typeMap.entries()) {
        let aggData = aggTypeMap.get(type)
        if (!aggData) {
          aggData = { count: 0, examplePaths: [] }
          aggTypeMap.set(type, aggData)
        }

        aggData.count += data.count

        for (const p of data.examplePaths) {
          if (aggData.examplePaths.length >= maxExamplePaths) break
          if (!aggData.examplePaths.includes(p)) aggData.examplePaths.push(p)
        }
      }
    }

    for (const variableKey of facts.types.variableObjectArrayLeaves) {
      aggregated.types.variableObjectArrayLeaves.add(variableKey)
    }

    // Shapes
    for (const [variableKey, lengths] of facts.shapes.variableLengths.entries()) {
      const existing = aggregated.shapes.variableLengths.get(variableKey) || {}
      const nextMin =
        lengths.min === undefined
          ? existing.min
          : existing.min === undefined
          ? lengths.min
          : Math.min(existing.min, lengths.min)
      const nextMax =
        lengths.max === undefined
          ? existing.max
          : existing.max === undefined
          ? lengths.max
          : Math.max(existing.max, lengths.max)
      aggregated.shapes.variableLengths.set(variableKey, { min: nextMin, max: nextMax })
    }

    for (const variableKey of facts.shapes.variableHasMixedArrayElements) {
      aggregated.shapes.variableHasMixedArrayElements.add(variableKey)
    }

    // Distinct
    for (const [variableKey, stringSet] of facts.distinct.strings.entries()) {
      let aggSet = aggregated.distinct.strings.get(variableKey)
      if (!aggSet) {
        aggSet = new Set<string>()
        aggregated.distinct.strings.set(variableKey, aggSet)
      }
      for (const value of stringSet) {
        if (aggSet.size >= maxDistinctTracking) break
        aggSet.add(value)
      }
    }

    for (const [variableKey, optionSet] of facts.distinct.options.entries()) {
      let aggSet = aggregated.distinct.options.get(variableKey)
      if (!aggSet) {
        aggSet = new Set<string>()
        aggregated.distinct.options.set(variableKey, aggSet)
      }
      for (const value of optionSet) {
        if (aggSet.size >= maxDistinctTracking) break
        aggSet.add(value)
      }
    }

    // Invariants: duplicates
    for (const [variableKey, scopeMap] of facts.invariants.duplicates.observationKeys.entries()) {
      let aggScopeMap = aggregated.invariants.duplicates.observationKeys.get(variableKey)
      if (!aggScopeMap) {
        aggScopeMap = new Map<string, Set<string>>()
        aggregated.invariants.duplicates.observationKeys.set(variableKey, aggScopeMap)
      }
      for (const [scopeKeyId, rowKeySet] of scopeMap.entries()) {
        let aggRowKeySet = aggScopeMap.get(scopeKeyId)
        if (!aggRowKeySet) {
          aggRowKeySet = new Set<string>()
          aggScopeMap.set(scopeKeyId, aggRowKeySet)
        }
        for (const rowKeyId of rowKeySet) aggRowKeySet.add(rowKeyId)
      }
    }

    for (const [
      variableKey,
      count,
    ] of facts.invariants.duplicates.duplicateObservationCounts.entries()) {
      addCount(aggregated.invariants.duplicates.duplicateObservationCounts, variableKey, count)
    }

    for (const [
      variableKey,
      example,
    ] of facts.invariants.duplicates.duplicateObservationExamples.entries()) {
      if (!aggregated.invariants.duplicates.duplicateObservationExamples.has(variableKey)) {
        aggregated.invariants.duplicates.duplicateObservationExamples.set(variableKey, {
          ...example,
        })
      }
    }

    // Invariants: collisions (defer counts until after aggregation)
    for (const [
      variableKey,
      keyPathString,
    ] of facts.invariants.collisions.variableKeyPathMap.entries()) {
      if (!aggregated.invariants.collisions.variableKeyPathMap.has(variableKey)) {
        aggregated.invariants.collisions.variableKeyPathMap.set(variableKey, keyPathString)
      }
    }

    for (const [
      variableKey,
      pathCounts,
    ] of facts.invariants.collisions.variableKeyPathCounts.entries()) {
      let aggPathCounts = aggregated.invariants.collisions.variableKeyPathCounts.get(variableKey)
      if (!aggPathCounts) {
        aggPathCounts = new Map<string, number>()
        aggregated.invariants.collisions.variableKeyPathCounts.set(variableKey, aggPathCounts)
      }
      for (const [path, count] of pathCounts.entries()) {
        aggPathCounts.set(path, (aggPathCounts.get(path) || 0) + count)
      }
    }

    // Invariants: row key anomalies
    for (const [
      variableKey,
      count,
    ] of facts.invariants.rowKeyAnomalies.rowKeyIdAnomalyCounts.entries()) {
      addCount(aggregated.invariants.rowKeyAnomalies.rowKeyIdAnomalyCounts, variableKey, count)
    }

    for (const [
      variableKey,
      example,
    ] of facts.invariants.rowKeyAnomalies.rowKeyIdAnomalyExamples.entries()) {
      if (!aggregated.invariants.rowKeyAnomalies.rowKeyIdAnomalyExamples.has(variableKey)) {
        aggregated.invariants.rowKeyAnomalies.rowKeyIdAnomalyExamples.set(variableKey, {
          ...example,
        })
      }
    }
  }

  // Recompute collision counts/key paths using aggregated path counts
  aggregated.invariants.collisions.variableKeyCollisionCounts.clear()
  aggregated.invariants.collisions.variableKeyCollisionKeyPaths.clear()

  for (const [
    variableKey,
    pathCounts,
  ] of aggregated.invariants.collisions.variableKeyPathCounts.entries()) {
    const firstPath = aggregated.invariants.collisions.variableKeyPathMap.get(variableKey)
    if (!firstPath) continue

    let collisionCount = 0
    let secondPath: string | undefined
    for (const [path, count] of pathCounts.entries()) {
      if (path === firstPath) continue
      collisionCount += count
      if (!secondPath) secondPath = path
    }

    if (collisionCount > 0) {
      aggregated.invariants.collisions.variableKeyCollisionCounts.set(variableKey, collisionCount)
      if (secondPath) {
        aggregated.invariants.collisions.variableKeyCollisionKeyPaths.set(variableKey, {
          first: firstPath,
          second: secondPath,
        })
      }
    }
  }

  return aggregated
}
