import type { ExtractionObservation } from "../types"

/**
 * ExtractionIndexStore - lightweight indices over observations.
 * Stores only indexes (no data) for fast lookups.
 * Observations should be accessed from the ExtractionBundle.
 */
export class ExtractionIndexStore {
  private readonly byVariableKey: Map<string, number[]>
  private readonly byComponentId: Map<number, number[]>
  private readonly componentIdsByVariableKey: Map<string, Set<number>>
  private readonly variableKeysByComponentId: Map<number, Set<string>>
  private readonly totalCount: number

  constructor(observations: ExtractionObservation[]) {
    this.byVariableKey = new Map()
    this.byComponentId = new Map()
    this.componentIdsByVariableKey = new Map()
    this.variableKeysByComponentId = new Map()

    for (let i = 0; i < observations.length; i++) {
      const obs = observations[i]
      const componentId = obs.scopeKeys.componentId

      if (!this.byVariableKey.has(obs.variableKey)) {
        this.byVariableKey.set(obs.variableKey, [])
      }
      this.byVariableKey.get(obs.variableKey)!.push(i)

      if (!this.byComponentId.has(componentId)) {
        this.byComponentId.set(componentId, [])
      }
      this.byComponentId.get(componentId)!.push(i)

      if (!this.componentIdsByVariableKey.has(obs.variableKey)) {
        this.componentIdsByVariableKey.set(obs.variableKey, new Set())
      }
      this.componentIdsByVariableKey.get(obs.variableKey)!.add(componentId)

      if (!this.variableKeysByComponentId.has(componentId)) {
        this.variableKeysByComponentId.set(componentId, new Set())
      }
      this.variableKeysByComponentId.get(componentId)!.add(obs.variableKey)
    }

    this.totalCount = observations.length
  }

  getObservationIndicesByVariableKey(variableKey: string): number[] {
    return this.byVariableKey.get(variableKey) || []
  }

  getObservationIndicesByComponentId(componentId: number): number[] {
    return this.byComponentId.get(componentId) || []
  }

  *iterateObservationsByVariableKey(
    variableKey: string,
    observations: ExtractionObservation[]
  ): Generator<ExtractionObservation, void, unknown> {
    const indices = this.getObservationIndicesByVariableKey(variableKey)
    for (const i of indices) {
      yield observations[i]
    }
  }

  *iterateObservationsByComponentId(
    componentId: number,
    observations: ExtractionObservation[]
  ): Generator<ExtractionObservation, void, unknown> {
    const indices = this.getObservationIndicesByComponentId(componentId)
    for (const i of indices) {
      yield observations[i]
    }
  }

  *iterateValueJsonByVariableKey(
    variableKey: string,
    observations: ExtractionObservation[]
  ): Generator<string, void, unknown> {
    const indices = this.getObservationIndicesByVariableKey(variableKey)
    for (const i of indices) {
      yield observations[i].valueJson
    }
  }

  getComponentIdsByVariableKey(variableKey: string): number[] {
    return Array.from(this.componentIdsByVariableKey.get(variableKey) ?? [])
  }

  getVariableKeysByComponentId(componentId: number): string[] {
    return Array.from(this.variableKeysByComponentId.get(componentId) ?? [])
  }

  getObservationCount(variableKey: string): number {
    return this.getObservationIndicesByVariableKey(variableKey).length
  }

  hasObservations(variableKey: string): boolean {
    return this.byVariableKey.has(variableKey)
  }

  getTotalCount(): number {
    return this.totalCount
  }
}

export function createExtractionIndexStore(
  observations: ExtractionObservation[]
): ExtractionIndexStore {
  return new ExtractionIndexStore(observations)
}
