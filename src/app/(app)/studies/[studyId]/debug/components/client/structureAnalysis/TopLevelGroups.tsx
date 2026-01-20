"use client"

import type { DebugStructureAnalysis } from "../../../utils/materializeDebugView"
import type { SelectedPath, TopLevelGroup } from "../../../types"
import PathBadge from "./PathBadge"

interface TopLevelGroupsProps {
  structureAnalysis: DebugStructureAnalysis
  topLevelGroups: Map<string, TopLevelGroup>
  selectedPath?: SelectedPath | null
  onPathClick: (path: string, componentId: number) => void
}

export default function TopLevelGroups({
  structureAnalysis,
  topLevelGroups,
  selectedPath,
  onPathClick,
}: TopLevelGroupsProps) {
  const hasRootTopLevel =
    structureAnalysis.statistics.totalTopLevelGroups === 0 &&
    structureAnalysis.structureType === "array"

  if (structureAnalysis.statistics.totalTopLevelGroups === 0 && !hasRootTopLevel) {
    return null
  }

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
        {hasRootTopLevel && structureAnalysis.components.length > 0 && (
          <PathBadge
            key="root"
            path="root"
            type="array"
            componentId={structureAnalysis.components[0]!.componentId}
            selectedPath={selectedPath}
            size="lg"
            onClick={(path, componentId) => onPathClick(path, componentId)}
          />
        )}
        {Array.from(topLevelGroups.entries()).map(([key, group]) => {
          // Find the first component that has this key
          const componentWithKey = structureAnalysis.components.find((c) =>
            c.topLevelKeys.includes(key)
          )

          if (!componentWithKey) return null

          return (
            <PathBadge
              key={key}
              path={key}
              type={group.type}
              componentId={componentWithKey.componentId}
              selectedPath={selectedPath}
              size="lg"
              onClick={onPathClick}
            />
          )
        })}
      </div>
    </div>
  )
}
