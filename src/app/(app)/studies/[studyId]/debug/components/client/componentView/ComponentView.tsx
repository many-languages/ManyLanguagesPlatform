"use client"

import type { EnrichedJatosStudyResult } from "@/src/types/jatos"
import type { ExtractedVariable } from "../../../../variables/types"
import type { HighlightedPaths, SelectedPath } from "../../../types"
import { Alert } from "@/src/app/components/Alert"
import { useMemo } from "react"
import { computeComponentStats } from "../../../utils/componentStats"
import ComponentDataViewer from "./ComponentDataViewer"
import PathBadge from "../structureAnalysis/PathBadge"
import { scrollToComponentData } from "../../../utils/pathHighlighting"

type ComponentResult = EnrichedJatosStudyResult["componentResults"][number]

interface ComponentViewProps {
  component: ComponentResult
  extractedVariables: ExtractedVariable[]
  selectedPath?: SelectedPath | null
  highlightedPaths?: HighlightedPaths | null
  onHighlightPath: (path: string, componentId: number) => void
}

export default function ComponentView({
  component,
  extractedVariables,
  selectedPath,
  highlightedPaths,
  onHighlightPath,
}: ComponentViewProps) {
  const handlePathClick = (path: string, componentId: number) => {
    onHighlightPath(path, componentId)
    scrollToComponentData(componentId, 100)
  }

  // Compute component stats
  const stats = useMemo(
    () => computeComponentStats(component.componentId, extractedVariables),
    [component.componentId, extractedVariables]
  )

  // Get extracted variables for this component that are nested (not top-level)
  const allExtractedPaths = useMemo(() => {
    const nestedVariables = extractedVariables.filter(
      (variable) => variable.componentIds.includes(component.componentId) && !variable.isTopLevel
    )

    // Collect all unique variables by variableName
    const variablesMap = new Map<string, ExtractedVariable>()
    nestedVariables.forEach((variable) => {
      if (!variablesMap.has(variable.variableName)) {
        variablesMap.set(variable.variableName, variable)
      }
    })

    return Array.from(variablesMap.values()).map((variable) => ({
      variableKey: variable.variableKey,
      variableName: variable.variableName,
      type: variable.type as "string" | "number" | "boolean" | "array" | "object",
    }))
  }, [component.componentId, extractedVariables])

  const highlightedPathsForComponent =
    highlightedPaths?.componentId === component.componentId ? highlightedPaths.jsonPaths : undefined

  return (
    <div className="card bg-base-200 p-4">
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-semibold">Component {component.componentId}</h3>
        <div className="flex gap-2 items-center">
          {component.parseError && <div className="badge badge-warning badge-sm">Parse Error</div>}
        </div>
      </div>

      {stats.totalVariables > 0 && (
        <div className="grid grid-cols-2 gap-4 mb-3">
          <div>
            <div className="text-xs text-muted-content">Max Depth</div>
            <div className="font-medium">{stats.maxDepth}</div>
          </div>
          <div>
            <div className="text-xs text-muted-content">Total Variables</div>
            <div className="font-medium">{stats.totalVariables}</div>
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
