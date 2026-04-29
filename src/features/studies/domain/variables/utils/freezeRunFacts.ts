import { RunFacts } from "../types"
import { RunFactsCollector } from "./runFactsCollector"

/**
 * Freeze run facts - creates an immutable snapshot from a mutable collector
 * Pure function: no side effects, returns defensive copy
 * Use after extraction is complete to create immutable facts for materialization
 */
export function freezeRunFacts(collector: RunFactsCollector): RunFacts {
  const facts = collector.runFacts

  return {
    limits: new Map(facts.limits),
    deepNesting: { ...facts.deepNesting },
    skippedNonJson: new Map(
      Array.from(facts.skippedNonJson.entries()).map(([k, v]) => [
        k,
        { count: v.count, examplePaths: [...v.examplePaths], tag: v.tag },
      ])
    ),
  }
}
