import type { ExtractionObservation } from "../types"

export class ExtractionIndexStore {
  private readonly byVariableKey: Map<string, number[]>
  private readonly byComponentId: Map<number, number[]>
  private readonly componentIdsByVariableKey: Map<string, Set<number>>
  private readonly variableKeysByComponentId: Map<number, Set<string>>
  private readonly byComponentAndVariableKey: Map<string, number[]>
  private readonly totalCount: number

  constructor(observations: ExtractionObservation[]) {
    this.byVariableKey = new Map()
    this.byComponentId = new Map()
    this.componentIdsByVariableKey = new Map()
    this.variableKeysByComponentId = new Map()
    this.byComponentAndVariableKey = new Map()

    for (let i = 0; i < observations.length; i++) {
      const obs = observations[i]!
      const componentId = obs.scopeKeys.componentId

      // (componentId, variableKey) -> indices
      const compositeKey = `${componentId}::${obs.variableKey}`
      let compositeArr = this.byComponentAndVariableKey.get(compositeKey)
      if (!compositeArr) {
        compositeArr = []
        this.byComponentAndVariableKey.set(compositeKey, compositeArr)
      }
      compositeArr.push(i)

      // variableKey -> indices
      let varArr = this.byVariableKey.get(obs.variableKey)
      if (!varArr) {
        varArr = []
        this.byVariableKey.set(obs.variableKey, varArr)
      }
      varArr.push(i)

      // componentId -> indices
      let compArr = this.byComponentId.get(componentId)
      if (!compArr) {
        compArr = []
        this.byComponentId.set(componentId, compArr)
      }
      compArr.push(i)

      // variableKey -> set(componentId)
      let compSet = this.componentIdsByVariableKey.get(obs.variableKey)
      if (!compSet) {
        compSet = new Set()
        this.componentIdsByVariableKey.set(obs.variableKey, compSet)
      }
      compSet.add(componentId)

      // componentId -> set(variableKey)
      let varSet = this.variableKeysByComponentId.get(componentId)
      if (!varSet) {
        varSet = new Set()
        this.variableKeysByComponentId.set(componentId, varSet)
      }
      varSet.add(obs.variableKey)
    }

    this.totalCount = observations.length
  }

  getObservationIndicesByVariableKey(variableKey: string): number[] {
    return this.byVariableKey.get(variableKey) ?? []
  }

  getObservationIndicesByComponentId(componentId: number): number[] {
    return this.byComponentId.get(componentId) ?? []
  }

  getObservationIndicesByComponentAndVariableKey(
    componentId: number,
    variableKey: string
  ): number[] {
    return this.byComponentAndVariableKey.get(`${componentId}::${variableKey}`) ?? []
  }

  getObservationPathsByComponentAndVariableKey(
    componentId: number,
    variableKey: string,
    observations: ExtractionObservation[]
  ): string[] {
    const idx = this.getObservationIndicesByComponentAndVariableKey(componentId, variableKey)
    return idx.map((i) => observations[i]!.path)
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

  *iterateObservationsByVariableKey(
    variableKey: string,
    observations: ExtractionObservation[]
  ): Generator<ExtractionObservation, void, unknown> {
    for (const i of this.getObservationIndicesByVariableKey(variableKey)) yield observations[i]!
  }

  *iterateObservationsByComponentId(
    componentId: number,
    observations: ExtractionObservation[]
  ): Generator<ExtractionObservation, void, unknown> {
    for (const i of this.getObservationIndicesByComponentId(componentId)) yield observations[i]!
  }

  *iterateValueJsonByVariableKey(
    variableKey: string,
    observations: ExtractionObservation[]
  ): Generator<string, void, unknown> {
    for (const i of this.getObservationIndicesByVariableKey(variableKey))
      yield observations[i]!.valueJson
  }
}

export function createExtractionIndexStore(
  observations: ExtractionObservation[]
): ExtractionIndexStore {
  return new ExtractionIndexStore(observations)
}
