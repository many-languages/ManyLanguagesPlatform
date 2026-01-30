import { EnrichedJatosStudyResult } from "@/src/types/jatos"
import { ExtractedVariable, ExtractionObservation } from "../../variables/types"
import { ExtractionIndexStore } from "../../variables/utils/extractionIndexStore"
import { ComponentExplorerModel, ComponentExplorerItem, ComponentBadge } from "../types"
import { computeComponentStats } from "./componentStats"
import { formatJson } from "@/src/lib/utils/formatJson"

export function createComponentExplorerModel(args: {
  enrichedResult: EnrichedJatosStudyResult
  extractedVariables: ExtractedVariable[]
  observations: ExtractionObservation[]
  indexStore: ExtractionIndexStore
}): ComponentExplorerModel {
  const { enrichedResult, extractedVariables, observations, indexStore } = args

  const components = enrichedResult.componentResults.filter((c) => {
    if (!c.dataContent) return false
    // Filter not empty components
    const obs = indexStore.getObservationIndicesByComponentId(c.componentId)
    return obs.length > 0
  })

  const variableByKey = new Map<string, ExtractedVariable>()
  for (const v of extractedVariables) variableByKey.set(v.variableKey, v)

  const items: ComponentExplorerItem[] = components.map((c) => {
    const keys = indexStore.getVariableKeysByComponentId(c.componentId)
    const stats = computeComponentStats(keys, variableByKey)

    const badges: ComponentBadge[] = []
    for (const key of keys) {
      const v = variableByKey.get(key)
      if (!v) continue
      badges.push({ variableKey: v.variableKey, variableName: v.variableName, type: v.type })
    }

    return { componentId: c.componentId, component: c, stats, badges }
  })

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
