"use client"

import type { SelectedPath, TopLevelGroup } from "../../../types"
import PathBadge from "./PathBadge"

interface TopLevelGroupsProps {
  topLevelGroups: Map<string, TopLevelGroup>
  selectedPath?: SelectedPath | null
  onPathClick: (path: string, componentId: number) => void
}

export default function TopLevelGroups({
  topLevelGroups,
  selectedPath,
  onPathClick,
}: TopLevelGroupsProps) {
  // Check if there's a root group (array structure at root level)
  const rootGroup = topLevelGroups.get("root")
  const hasRootTopLevel = rootGroup !== undefined && rootGroup.type === "array"

  // If no groups at all, don't render
  if (topLevelGroups.size === 0) {
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
        {hasRootTopLevel && rootGroup && rootGroup.variables.length > 0 && (
          <PathBadge
            key="root"
            path="root"
            type="array"
            componentId={rootGroup.variables[0]!.componentIds[0]!}
            selectedPath={selectedPath}
            size="lg"
            onClick={(path, componentId) => onPathClick(path, componentId)}
          />
        )}
        {Array.from(topLevelGroups.entries())
          .filter(([key]) => key !== "root" || !hasRootTopLevel) // Don't show root twice if already shown above
          .map(([key, group]) => {
            // Get componentId from first variable in the group
            const firstVariable = group.variables[0]
            if (!firstVariable || firstVariable.componentIds.length === 0) {
              return null
            }

            return (
              <PathBadge
                key={key}
                path={key}
                type={group.type}
                componentId={firstVariable.componentIds[0]!}
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
