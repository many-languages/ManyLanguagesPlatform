import { EnrichedJatosStudyResult } from "@/src/types/jatos"
import { ComponentStats } from "./utils/componentStats"
import { ExtractedVariable } from "../variables/types"

// Highlighted path state for badge and JSON tree highlighting
export type SelectedPath = {
  selectedPath: string // Path identifier to highlight (variableKey for variables)
  componentId: number // Which component this selection applies to
}

type ComponentId = number

export type ComponentExplorerSelection = ComponentId | "all" | null

export type ComponentBadge = {
  variableKey: string
  variableName: string
  type: "string" | "number" | "boolean" | "array" | "object"
}

export type ComponentExplorerItem = {
  componentId: ComponentId
  component: EnrichedJatosStudyResult["componentResults"][number]
  stats: ComponentStats
  badges: ComponentBadge[]
}

export type ComponentExplorerModel = {
  // base list (already filtered to dataContent)
  items: ComponentExplorerItem[]
  itemById: Map<ComponentId, ComponentExplorerItem>
  firstComponentId: ComponentId | null

  // selection helper
  getItemsToRender: (sel: ComponentExplorerSelection) => ComponentExplorerItem[]

  // on-demand helpers
  getCopyText: (sel: ComponentExplorerSelection) => string
  getHighlightPaths: (componentId: ComponentId, variableKey: string) => string[]
}

export type VariableRow = {
  variableKey: string
  variableName: string
  type: ExtractedVariable["type"]
  occurrences: number
  examplePreview: string
  _variable: ExtractedVariable
}
