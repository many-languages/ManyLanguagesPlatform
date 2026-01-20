import { ExtractedVariable } from "../variables/types"

// Highlighted path state for badge and JSON tree highlighting
export type SelectedPath = {
  selectedPath: string // Path identifier to highlight (variableKey for variables, key name for top-level keys)
  componentId: number // Which component this selection applies to
}

export type HighlightedPaths = {
  componentId: number // Which component these paths apply to
  jsonPaths: string[] // Concrete JSON paths for tree highlighting
}

// Top-level group containing variables and their type
export type TopLevelGroup = {
  variables: ExtractedVariable[] // Variables grouped by top-level key (use variable.componentIds for component info)
  type: "primitive" | "array" | "object"
}
