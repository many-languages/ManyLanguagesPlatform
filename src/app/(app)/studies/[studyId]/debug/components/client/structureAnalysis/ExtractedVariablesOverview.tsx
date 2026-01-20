"use client"

import type { SelectedPath, TopLevelGroup } from "../../../types"
import PathBadge from "./PathBadge"

interface ExtractedVariablesOverviewProps {
  topLevelGroups: Map<string, TopLevelGroup>
  selectedPath?: SelectedPath | null
  onPathClick: (path: string, componentId: number) => void
}

export default function ExtractedVariablesOverview({
  topLevelGroups,
  selectedPath,
  onPathClick,
}: ExtractedVariablesOverviewProps) {
  if (topLevelGroups.size === 0) return null

  return (
    <div className="space-y-4 mt-6">
      {Array.from(topLevelGroups.entries()).map(([topLevelKey, group]) => (
        <div key={topLevelKey} className="card bg-base-200 p-4">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-semibold text-sm">
              Extracted Variables from <span className="font-mono">{topLevelKey}</span>
            </h4>
            <div className="text-xs text-muted-content">
              {group.variables.length} variable{group.variables.length !== 1 ? "s" : ""}
            </div>
          </div>
          <div className="flex flex-wrap gap-1">
            {group.variables.flatMap((variable) =>
              variable.componentIds.map((componentId) => {
                // Normalize type for tooltip
                const tooltipType =
                  variable.type === "string" ||
                  variable.type === "number" ||
                  variable.type === "boolean"
                    ? "primitive"
                    : variable.type === "array" || variable.type === "object"
                    ? variable.type
                    : "primitive"

                const unshownCount =
                  variable.examples.length > 0
                    ? variable.occurrences - variable.examples.length
                    : undefined

                return (
                  <PathBadge
                    key={`${variable.variableKey}-${componentId}`}
                    path={variable.variableKey}
                    name={variable.variableName}
                    type={variable.type}
                    componentId={componentId}
                    selectedPath={selectedPath}
                    size="sm"
                    tooltipType={tooltipType}
                    unshownObservationsCount={unshownCount}
                    onClick={onPathClick}
                  />
                )
              })
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
