import { VariableFacts } from "../types"
import { VariableFactsCollector } from "./variableFactsCollector"

/**
 * Freeze variable facts - creates an immutable snapshot from a mutable collector
 * Pure function: no side effects, returns defensive copy
 * Use after extraction is complete to create immutable facts for aggregation
 */
export function freezeVariableFacts(collector: VariableFactsCollector): VariableFacts {
  const facts = collector.facts

  return {
    counts: {
      variableCounts: new Map(facts.counts.variableCounts),
      variableNullCounts: new Map(facts.counts.variableNullCounts),
      variableUnserializableFallbacks: new Map(facts.counts.variableUnserializableFallbacks),
    },
    types: {
      variableTypes: new Map(
        Array.from(facts.types.variableTypes.entries()).map(([key, typeMap]) => [
          key,
          new Map(
            Array.from(typeMap.entries()).map(([type, data]) => [
              type,
              { count: data.count, examplePaths: [...data.examplePaths] },
            ])
          ),
        ])
      ),
      variableObjectArrayLeaves: new Set(facts.types.variableObjectArrayLeaves),
    },
    shapes: {
      variableLengths: new Map(
        Array.from(facts.shapes.variableLengths.entries()).map(([key, lengths]) => [
          key,
          { ...lengths },
        ])
      ),
      variableHasMixedArrayElements: new Set(facts.shapes.variableHasMixedArrayElements),
    },
    distinct: {
      strings: new Map(
        Array.from(facts.distinct.strings.entries()).map(([key, stringSet]) => [
          key,
          new Set(stringSet),
        ])
      ),
      options: new Map(
        Array.from(facts.distinct.options.entries()).map(([key, optionSet]) => [
          key,
          new Set(optionSet),
        ])
      ),
    },
    invariants: {
      duplicates: {
        observationKeys: new Map(
          Array.from(facts.invariants.duplicates.observationKeys.entries()).map(
            ([variableKey, scopeMap]) => [
              variableKey,
              new Map(
                Array.from(scopeMap.entries()).map(([scopeKeyId, rowKeySet]) => [
                  scopeKeyId,
                  new Set(rowKeySet),
                ])
              ),
            ]
          )
        ),
        duplicateObservationCounts: new Map(facts.invariants.duplicates.duplicateObservationCounts),
        duplicateObservationExamples: new Map(
          Array.from(facts.invariants.duplicates.duplicateObservationExamples.entries()).map(
            ([key, example]) => [key, { ...example }]
          )
        ),
      },
      collisions: {
        variableKeyPathMap: new Map(facts.invariants.collisions.variableKeyPathMap),
        variableKeyPathCounts: new Map(
          Array.from(facts.invariants.collisions.variableKeyPathCounts.entries()).map(
            ([key, pathMap]) => [
              key,
              new Map(Array.from(pathMap.entries()).map(([path, count]) => [path, count])),
            ]
          )
        ),
        variableKeyCollisionCounts: new Map(facts.invariants.collisions.variableKeyCollisionCounts),
        variableKeyCollisionKeyPaths: new Map(
          Array.from(facts.invariants.collisions.variableKeyCollisionKeyPaths.entries()).map(
            ([key, paths]) => [key, { ...paths }]
          )
        ),
      },
      rowKeyAnomalies: {
        rowKeyIdAnomalyCounts: new Map(facts.invariants.rowKeyAnomalies.rowKeyIdAnomalyCounts),
        rowKeyIdAnomalyExamples: new Map(
          Array.from(facts.invariants.rowKeyAnomalies.rowKeyIdAnomalyExamples.entries()).map(
            ([key, example]) => [key, { ...example }]
          )
        ),
      },
    },
  }
}
