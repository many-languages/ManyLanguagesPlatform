import type { EnrichedJatosComponentResult, EnrichedJatosStudyResult } from "@/src/types/jatos"
import type { ExtractedVariable, ExtractionObservation } from "../variables/types"
import type { ExtractionIndexStore } from "../variables/utils/extractionIndexStore"
import { ComponentExplorerModel, ComponentExplorerItem, ComponentBadge } from "./types"
import { computeComponentStats } from "./componentStats"
import { formatJson } from "@/src/lib/utils/formatJson"

function describeUnextractedComponent(component: EnrichedJatosComponentResult): string {
  if (!component.dataContent) return "no data"
  if (component.parseError) return "parse error, no variables"
  if (component.detectedFormat?.format === "text") return "text, not extractable"
  return "no variables extracted"
}

export function createComponentExplorerModel(args: {
  enrichedResult: EnrichedJatosStudyResult
  extractedVariables: ExtractedVariable[]
  observations: ExtractionObservation[]
  indexStore: ExtractionIndexStore
}): ComponentExplorerModel {
  const { enrichedResult, extractedVariables, observations, indexStore } = args

  const variableByKey = new Map<string, ExtractedVariable>()
  for (const v of extractedVariables) variableByKey.set(v.variableKey, v)

  const buildItem = (c: EnrichedJatosComponentResult): ComponentExplorerItem => {
    const keys = indexStore.getVariableKeysByComponentId(c.componentId)
    const stats = computeComponentStats(keys, variableByKey)

    const badges: ComponentBadge[] = []
    for (const key of keys) {
      const v = variableByKey.get(key)
      if (!v) continue
      badges.push({ variableKey: v.variableKey, variableName: v.variableName, type: v.type })
    }

    const hasObservations = indexStore.getObservationIndicesByComponentId(c.componentId).length > 0
    return {
      componentId: c.componentId,
      component: c,
      stats,
      badges,
      statusNote: hasObservations ? null : describeUnextractedComponent(c),
    }
  }

  // Components without variables stay listed so researchers can still read their raw data
  // (that is exactly where something went wrong). Extracted ones come first; sort is stable.
  const rank = (item: ComponentExplorerItem) =>
    item.statusNote === null ? 0 : item.component.dataContent ? 1 : 2
  const items: ComponentExplorerItem[] = enrichedResult.componentResults
    .map(buildItem)
    .sort((a, b) => rank(a) - rank(b))

  const itemById = new Map(items.map((it) => [it.componentId, it] as const))

  const firstComponentId = items.length > 0 ? items[0].componentId : null

  return {
    items,
    itemById,
    firstComponentId,

    getItemsToRender(sel) {
      if (sel === "all") return items
      if (typeof sel === "number") return itemById.has(sel) ? [itemById.get(sel)!] : []
      return []
    },

    getCopyText(sel) {
      if (sel === "all") {
        const all: Record<string, any> = {}
        for (const it of items) {
          const c = it.component
          if (!c.dataContent) continue
          const key = `component_${c.componentId}`
          const format = c.detectedFormat?.format
          if (format === "json" && c.parsedData) all[key] = c.parsedData
          else all[key] = { raw: c.dataContent, parsed: c.parsedData, format }
        }
        return formatJson(all)
      }

      if (typeof sel === "number") {
        const it = itemById.get(sel)
        if (!it?.component.dataContent) return ""
        const c = it.component
        const format = c.detectedFormat?.format
        if (format === "json" && c.parsedData) return formatJson(c.parsedData)
        return c.dataContent ?? ""
      }

      return ""
    },

    getHighlightPaths(componentId, variableKey) {
      // on-demand, fast due to composite index
      return indexStore.getObservationPathsByComponentAndVariableKey(
        componentId,
        variableKey,
        observations
      )
    },
  }
}
