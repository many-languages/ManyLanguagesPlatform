"use client"

import type { EnrichedJatosStudyResult } from "@/src/types/jatos"
import type { OriginalStructureAnalysis } from "../../../../variables/utils/structureAnalyzer/analyzeOriginalStructure"
import PathBadge from "./PathBadge"

interface TopLevelGroupsProps {
  enrichedResult: EnrichedJatosStudyResult
  originalStructureAnalysis: OriginalStructureAnalysis
  highlightedPath?: { path: string; componentId: number } | null
  onPathClick: (path: string, componentId: number) => void
}

export default function TopLevelGroups({
  enrichedResult,
  originalStructureAnalysis,
  highlightedPath,
  onPathClick,
}: TopLevelGroupsProps) {
  if (originalStructureAnalysis.statistics.totalTopLevelGroups === 0) return null

  return (
    <div className="card bg-base-200 p-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold">Top-Level Groups</h3>
        <div className="flex gap-3 text-xs text-muted-content">
          <div className="flex items-center gap-1">
            <span className="badge badge-primary badge-xs"></span>
            <span>Primitive</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="badge badge-secondary badge-xs"></span>
            <span>Array</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="badge badge-accent badge-xs"></span>
            <span>Object</span>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {Array.from(originalStructureAnalysis.topLevelKeyTypes.keys()).map((key) => {
          const keyType = originalStructureAnalysis.topLevelKeyTypes.get(key)

          // Find the first component that has this key
          const componentWithKey = enrichedResult.componentResults.find((component) => {
            const componentAnalysis = originalStructureAnalysis.components.find(
              (c) => c.componentId === component.componentId
            )
            return componentAnalysis?.topLevelKeys.includes(key)
          })

          if (!componentWithKey) return null

          return (
            <PathBadge
              key={key}
              path={key}
              type={keyType || "object"}
              componentId={componentWithKey.componentId}
              highlightedPath={highlightedPath}
              size="lg"
              onClick={onPathClick}
            />
          )
        })}
      </div>
    </div>
  )
}
