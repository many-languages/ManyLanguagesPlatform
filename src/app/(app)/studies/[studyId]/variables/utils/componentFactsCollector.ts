import type { ComponentFactsEntry, DiagnosticCode } from "../types"

/**
 * ComponentFactsCollector - mutable collector for component-level facts during extraction
 */
export class ComponentFactsCollector {
  private readonly byComponentId = new Map<number, ComponentFactsEntry>()

  recordComponent(fact: {
    componentId: number
    detectedFormat?: string
    hasParsedData: boolean
    hasDataContent: boolean
  }): void {
    this.byComponentId.set(fact.componentId, {
      componentId: fact.componentId,
      detectedFormat: fact.detectedFormat,
      hasParsedData: fact.hasParsedData,
      hasDataContent: fact.hasDataContent,
    })
  }

  recordParseError(componentId: number, parseError: string): void {
    const existing = this.ensure(componentId)
    existing.parseError = parseError
  }

  recordFormatError(componentId: number, code: DiagnosticCode, message: string): void {
    const existing = this.ensure(componentId)
    existing.formatError = { code, message }
  }

  getFacts(): Map<number, ComponentFactsEntry> {
    return this.byComponentId
  }

  private ensure(componentId: number): ComponentFactsEntry {
    const existing = this.byComponentId.get(componentId)
    if (existing) return existing

    const fallback: ComponentFactsEntry = {
      componentId,
      hasParsedData: false,
      hasDataContent: false,
    }
    this.byComponentId.set(componentId, fallback)
    return fallback
  }
}
