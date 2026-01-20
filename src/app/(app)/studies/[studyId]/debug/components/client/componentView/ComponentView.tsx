"use client"

import type { EnrichedJatosStudyResult } from "@/src/types/jatos"
import type { SelectedPath } from "../../../types"
import { Alert } from "@/src/app/components/Alert"
import type { ComponentStats } from "../../../utils/componentStats"
import ComponentDataViewer from "./ComponentDataViewer"
import VariableBadge from "../structureAnalysis/VariableBadge"
import { scrollToComponentData } from "../../../utils/pathHighlighting"

type ComponentResult = EnrichedJatosStudyResult["componentResults"][number]

interface ComponentViewProps {
  component: ComponentResult
  extractedPaths: Array<{
    variableKey: string
    variableName: string
    type: "string" | "number" | "boolean" | "array" | "object"
  }>
  stats: ComponentStats
  selectedPath?: SelectedPath | null
  highlightPaths?: string[]
  onHighlightPath: (variableKey: string, componentId: number) => void
}

export default function ComponentView({
  component,
  extractedPaths,
  selectedPath,
  highlightPaths,
  onHighlightPath,
  stats,
}: ComponentViewProps) {
  const handlePathClick = (variableKey: string, componentId: number) => {
    onHighlightPath(variableKey, componentId)
    scrollToComponentData(componentId, 100)
  }

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

      {extractedPaths.length > 0 && (
        <div className="mb-3 mt-4">
          <div className="text-xs text-muted-content mb-1">Extracted Variables:</div>
          <div className="flex flex-wrap gap-1">
            {extractedPaths.map((pathItem) => (
              <VariableBadge
                key={pathItem.variableKey}
                variableKey={pathItem.variableKey}
                variableName={pathItem.variableName}
                type={pathItem.type}
                componentId={component.componentId}
                selectedPath={selectedPath}
                size="sm"
                onSelect={handlePathClick}
              />
            ))}
          </div>
        </div>
      )}

      {component.parseError && (
        <Alert variant="warning" className="mb-3" title="Parse Error">
          {component.parseError}
        </Alert>
      )}

      <ComponentDataViewer component={component} highlightPaths={highlightPaths} />
    </div>
  )
}
