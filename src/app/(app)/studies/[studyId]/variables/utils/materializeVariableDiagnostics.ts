import type {
  Diagnostic,
  VariableHeuristicThresholds,
  VariableType,
  ValueType,
  VariableFacts,
} from "../types"

/**
 * Materialize variable-level diagnostics from recorded facts.
 * Pure function: no side effects, no engine dependency.
 */
export function materializeVariableDiagnostics(
  variableKey: string,
  facts: VariableFacts,
  variableType: VariableType,
  thresholds: VariableHeuristicThresholds,
  opts: {
    maxExamplePaths: number
    includeManyNulls?: boolean // if you decide MANY_NULLS is redundant with HIGH_NULL_RATE
  }
): Diagnostic[] {
  const diags: Diagnostic[] = []
  const seen = new Set<string>()
  const maxExamplePaths = opts.maxExamplePaths
  const includeManyNulls = opts.includeManyNulls ?? true

  const pushOnce = (d: Diagnostic) => {
    const key = `${d.code}||${d.message}`
    if (seen.has(key)) return
    seen.add(key)
    diags.push(d)
  }

  const count = (m: Map<string, number>) => m.get(variableKey) || 0

  const totalCount = count(facts.counts.variableCounts)
  const nullCount = count(facts.counts.variableNullCounts)
  const fallbackCount = count(facts.counts.variableUnserializableFallbacks)

  // ---------- TYPE_DRIFT ----------
  const typeMap = facts.types.variableTypes.get(variableKey)
  const nonNullTypes = getNonNullTypes(typeMap)

  if (nonNullTypes.length > 1) {
    const typesStr = nonNullTypes.map(([t, c]) => `${t}(${c})`).join(", ")

    const examplePaths: string[] = []
    if (typeMap) {
      // collect example paths across all non-null types (up to maxExamplePaths total)
      for (const [t, data] of typeMap.entries()) {
        if (t === "null" || data.count <= 0) continue
        for (const p of data.examplePaths) {
          examplePaths.push(p)
          if (examplePaths.length >= maxExamplePaths) break
        }
        if (examplePaths.length >= maxExamplePaths) break
      }
    }

    pushOnce({
      severity: "warning",
      code: "TYPE_DRIFT",
      message: `Variable '${variableKey}' has multiple types: ${typesStr}`,
      metadata: {
        variable: variableKey,
        types: Object.fromEntries(nonNullTypes),
        ...(examplePaths.length > 0 ? { examplePaths } : {}),
      },
    })
  }

  // ---------- DUPLICATE_OBSERVATION ----------
  const duplicateCount = count(facts.invariants.duplicates.duplicateObservationCounts)
  if (duplicateCount > 0) {
    const example = facts.invariants.duplicates.duplicateObservationExamples.get(variableKey)
    pushOnce({
      severity: "warning",
      code: "DUPLICATE_OBSERVATION",
      message: `Variable '${variableKey}' has ${duplicateCount} duplicate observation${
        duplicateCount === 1 ? "" : "s"
      }`,
      metadata: {
        variable: variableKey,
        count: duplicateCount,
        ...(example ? { example } : {}),
      },
    })
  }

  // ---------- VARIABLE_KEY_COLLISION ----------
  const collisionCount = count(facts.invariants.collisions.variableKeyCollisionCounts)
  if (collisionCount > 0) {
    const keyPaths = facts.invariants.collisions.variableKeyCollisionKeyPaths.get(variableKey)
    pushOnce({
      severity: "warning",
      code: "VARIABLE_KEY_COLLISION",
      message: `VariableKey '${variableKey}' maps to different keyPaths: '${keyPaths?.first}' vs '${keyPaths?.second}'`,
      metadata: {
        variable: variableKey,
        firstKeyPathString: keyPaths?.first,
        currentKeyPathString: keyPaths?.second,
        count: collisionCount,
      },
    })
  }

  // ---------- ROW_KEY_ID_ANOMALY ----------
  const anomalyCount = count(facts.invariants.rowKeyAnomalies.rowKeyIdAnomalyCounts)
  if (anomalyCount > 0) {
    const example = facts.invariants.rowKeyAnomalies.rowKeyIdAnomalyExamples.get(variableKey)
    pushOnce({
      severity: "warning",
      code: "ROW_KEY_ID_ANOMALY",
      message: `Variable '${variableKey}' has ${anomalyCount} rowKeyId anomaly${
        anomalyCount === 1 ? "" : "s"
      }`,
      metadata: {
        variable: variableKey,
        count: anomalyCount,
        ...(example ? { example } : {}),
      },
    })
  }

  // ---------- NULL RATE ----------
  if (totalCount > 0) {
    const nullRate = nullCount / totalCount

    if (nullRate > thresholds.highNullRate) {
      pushOnce({
        severity: "warning",
        code: "HIGH_NULL_RATE",
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

    if (includeManyNulls && nullRate >= thresholds.manyNulls) {
      pushOnce({
        severity: "warning",
        code: "MANY_NULLS",
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

  // ---------- VALUE_JSON_UNSERIALIZABLE_FALLBACK_USED ----------
  if (fallbackCount > 0) {
    pushOnce({
      severity: "warning",
      code: "VALUE_JSON_UNSERIALIZABLE_FALLBACK_USED",
      message: `Variable '${variableKey}' has ${fallbackCount} unserializable value${
        fallbackCount === 1 ? "" : "s"
      } (fallback used)`,
      metadata: { variable: variableKey, count: fallbackCount },
    })
  }

  // ---------- UNEXPECTED_OBJECT_ARRAY_LEAF ----------
  if (facts.types.variableObjectArrayLeaves.has(variableKey)) {
    pushOnce({
      severity: "warning",
      code: "UNEXPECTED_OBJECT_ARRAY_LEAF",
      message: `Variable '${variableKey}' has valueType object or array (unexpected leaf type)`,
      metadata: { variable: variableKey },
    })
  }

  // ---------- MIXED_ARRAY_ELEMENT_TYPES ----------
  if (facts.shapes.variableHasMixedArrayElements.has(variableKey)) {
    pushOnce({
      severity: "warning",
      code: "MIXED_ARRAY_ELEMENT_TYPES",
      message: `Variable '${variableKey}' has array elements with mixed types`,
      metadata: { variable: variableKey },
    })
  }

  // ---------- HIGH_OCCURRENCE ----------
  if (totalCount > thresholds.highOccurrence) {
    pushOnce({
      severity: "warning",
      code: "HIGH_OCCURRENCE",
      message: `Variable '${variableKey}' has high occurrence count: ${totalCount} (threshold: ${thresholds.highOccurrence})`,
      metadata: {
        variable: variableKey,
        observationCount: totalCount,
        threshold: thresholds.highOccurrence,
      },
    })
  }

  // ---------- HIGH_CARDINALITY ----------
  if (variableType === "string") {
    const distinctStringCount = facts.distinct.strings.get(variableKey)?.size || 0
    if (distinctStringCount >= thresholds.highCardinality) {
      pushOnce({
        severity: "warning",
        code: "HIGH_CARDINALITY",
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
      pushOnce({
        severity: "warning",
        code: "HIGH_CARDINALITY",
        message: `Variable '${variableKey}' has high cardinality: ${distinctOptionCount} distinct options (threshold: ${thresholds.highCardinality})`,
        metadata: {
          variable: variableKey,
          distinctCount: distinctOptionCount,
          threshold: thresholds.highCardinality,
        },
      })
    }
  }

  // ---------- LARGE_VALUES ----------
  const lengths = facts.shapes.variableLengths.get(variableKey)
  if (lengths?.max !== undefined && lengths.max > thresholds.largeValueLength) {
    pushOnce({
      severity: "warning",
      code: "LARGE_VALUES",
      message: `Variable '${variableKey}' has large values: max length ${lengths.max} (threshold: ${thresholds.largeValueLength})`,
      metadata: {
        variable: variableKey,
        maxLength: lengths.max,
        threshold: thresholds.largeValueLength,
      },
    })
  }

  return diags
}

/**
 * Filters out null types and returns [type, count] pairs.
 */
function getNonNullTypes(
  typeMap?: Map<ValueType, { count: number; examplePaths: string[] }>
): Array<[ValueType, number]> {
  if (!typeMap) return []
  return Array.from(typeMap.entries())
    .filter(([t, data]) => t !== "null" && data.count > 0)
    .map(([t, data]) => [t, data.count])
}
