"use client"

import type { PathDisplay } from "../../../types"
import PathBadge from "./PathBadge"

interface ExtractedVariablesOverviewProps {
  allExtractedPathsByParentKey: Map<string, Array<{ path: PathDisplay; componentId: number }>>
  highlightedPath?: { path: string; componentId: number } | null
  onPathClick: (path: string, componentId: number) => void
}

export default function ExtractedVariablesOverview({
  allExtractedPathsByParentKey,
  highlightedPath,
  onPathClick,
}: ExtractedVariablesOverviewProps) {
  if (allExtractedPathsByParentKey.size === 0) return null

  return (
    <div className="space-y-4 mt-6">
      {Array.from(allExtractedPathsByParentKey.entries()).map(
        ([parentKey, pathsWithComponents]) => (
          <div key={parentKey} className="card bg-base-200 p-4">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-semibold text-sm">
                Extracted Variables from <span className="font-mono">{parentKey}</span>
              </h4>
              <div className="text-xs text-muted-content">
                {pathsWithComponents.length} variable{pathsWithComponents.length !== 1 ? "s" : ""}
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {pathsWithComponents.map(({ path, componentId }) => {
                // Normalize type for tooltip
                const tooltipType =
                  path.type === "string" ||
                  path.type === "number" ||
                  path.type === "boolean" ||
                  path.type === "null"
                    ? "primitive"
                    : path.type
                return (
                  <PathBadge
                    key={`${path.path}-${componentId}`}
                    path={path.path}
                    type={path.type}
                    componentId={componentId}
                    highlightedPath={highlightedPath}
                    size="sm"
                    tooltipType={tooltipType}
                    onClick={onPathClick}
                  />
                )
              })}
            </div>
          </div>
        )
      )}
    </div>
  )
}
