// Highlighted path state for badge and JSON tree highlighting
export type SelectedPath = {
  selectedPath: string // Path identifier to highlight (variableKey for variables)
  componentId: number // Which component this selection applies to
}

export type HighlightedPaths = {
  componentId: number // Which component these paths apply to
  jsonPaths: string[] // Concrete JSON paths for tree highlighting
}
