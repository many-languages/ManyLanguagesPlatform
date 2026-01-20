"use client"

import type { EnrichedJatosStudyResult } from "@/src/types/jatos"
import type { DebugStructureAnalysis } from "../../../utils/materializeDebugView"
import type { ExtractedVariable } from "../../../../variables/types"
import type { HighlightedPaths, SelectedPath } from "../../../types"
import { Alert } from "@/src/app/components/Alert"
import ComponentDataViewer from "./ComponentDataViewer"
import PathBadge from "../structureAnalysis/PathBadge"
import { scrollToComponentData } from "../../../utils/pathHighlighting"

type ComponentResult = EnrichedJatosStudyResult["componentResults"][number]

interface ComponentViewProps {
  component: ComponentResult
  componentAnalysis?: DebugStructureAnalysis["components"][number]
  extractedVariables: ExtractedVariable[]
  selectedPath?: SelectedPath | null
  highlightedPaths?: HighlightedPaths | null
  onHighlightPath: (path: string, componentId: number) => void
}

export default function ComponentView({
  component,
  componentAnalysis,
  extractedVariables,
  selectedPath,
  highlightedPaths,
  onHighlightPath,
}: ComponentViewProps) {
  const handlePathClick = (path: string, componentId: number) => {
    onHighlightPath(path, componentId)
    scrollToComponentData(componentId, 100)
  }

  // Get extracted variables for this component that are nested (not top-level)
  const nestedVariables = extractedVariables.filter(
    (variable) => variable.componentIds.includes(component.componentId) && !variable.isTopLevel
  )

  // Collect all unique variables
  const variablesMap = new Map<string, ExtractedVariable>()
  nestedVariables.forEach((variable) => {
    if (!variablesMap.has(variable.variableName)) {
      variablesMap.set(variable.variableName, variable)
    }
  })

  const allExtractedPaths = Array.from(variablesMap.values()).map((variable) => ({
    variableKey: variable.variableKey,
    variableName: variable.variableName,
    type: variable.type as "string" | "number" | "boolean" | "array" | "object",
  }))

  const highlightedPathsForComponent =
    highlightedPaths?.componentId === component.componentId ? highlightedPaths.jsonPaths : undefined

  return (
    <div className="card bg-base-200 p-4">
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-semibold">Component {component.componentId}</h3>
        <div className="flex gap-2 items-center">
          {componentAnalysis && (
            <span className="badge badge-lg capitalize">{componentAnalysis.structureType}</span>
          )}
          {component.parseError && <div className="badge badge-warning badge-sm">Parse Error</div>}
        </div>
      </div>

      {componentAnalysis && (
        <div className="grid grid-cols-3 gap-4 mb-3">
          <div>
            <div className="text-xs text-muted-content">Max Depth</div>
            <div className="font-medium">{componentAnalysis.maxDepth}</div>
          </div>
          <div>
            <div className="text-xs text-muted-content">Top-Level Keys</div>
            <div className="font-medium">{componentAnalysis.topLevelKeys.length}</div>
          </div>
          <div>
            <div className="text-xs text-muted-content">Total Keys</div>
            <div className="font-medium">{componentAnalysis.totalKeys}</div>
          </div>
        </div>
      )}

      {componentAnalysis && componentAnalysis.topLevelKeys.length > 0 && (
        <div className="mb-3">
          <div className="text-xs text-muted-content mb-1">Top-Level Keys:</div>
          <div className="flex flex-wrap gap-1">
            {componentAnalysis.topLevelKeys.map((key: string) => {
              const keyType = componentAnalysis.topLevelKeyTypes.get(key)
              return (
                <PathBadge
                  key={key}
                  path={key}
                  type={keyType || "object"}
                  componentId={component.componentId}
                  selectedPath={selectedPath}
                  size="sm"
                  onClick={handlePathClick}
                />
              )
            })}
          </div>
        </div>
      )}

      {allExtractedPaths.length > 0 && (
        <div className="mb-3 mt-4">
          <div className="text-xs text-muted-content mb-1">Extracted Variables from Objects:</div>
          <div className="flex flex-wrap gap-1">
            {allExtractedPaths.map((pathItem) => {
              const tooltipType = pathItem.type === "string" ? "primitive" : pathItem.type
              return (
                <PathBadge
                  key={pathItem.variableKey}
                  path={pathItem.variableKey}
                  name={pathItem.variableName}
                  type={pathItem.type}
                  componentId={component.componentId}
                  selectedPath={selectedPath}
                  size="sm"
                  tooltipType={tooltipType}
                  onClick={handlePathClick}
                />
              )
            })}
          </div>
        </div>
      )}

      {component.parseError && (
        <Alert variant="warning" className="mb-3" title="Parse Error">
          {component.parseError}
        </Alert>
      )}

      <ComponentDataViewer component={component} highlightPaths={highlightedPathsForComponent} />
    </div>
  )
}
