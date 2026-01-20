import type { ComponentFacts, ComponentFactsEntry } from "../types"
import { ComponentFactsCollector } from "./componentFactsCollector"

export function freezeComponentFacts(collector: ComponentFactsCollector): ComponentFacts {
  const frozen = new Map<number, ComponentFactsEntry>()
  for (const [componentId, entry] of collector.getFacts().entries()) {
    frozen.set(componentId, { ...entry })
  }
  return frozen
}
