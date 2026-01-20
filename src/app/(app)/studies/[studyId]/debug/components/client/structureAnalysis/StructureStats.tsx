"use client"

import type { DebugStructureAnalysis } from "../../../utils/materializeDebugView"

interface StructureStatsProps {
  structureAnalysis: DebugStructureAnalysis
}

export default function StructureStats({ structureAnalysis }: StructureStatsProps) {
  return (
    <div className="stats stats-vertical lg:stats-horizontal shadow w-full">
      <div className="stat">
        <div className="stat-title">Data Structure</div>
        <div className="stat-value text-primary capitalize">{structureAnalysis.structureType}</div>
      </div>
      <div className="stat">
        <div className="stat-title">Max Nesting Depth</div>
        <div className="stat-value text-secondary">
          {structureAnalysis.statistics.maxNestingDepth}
        </div>
        <div className="stat-desc">
          Average: {structureAnalysis.statistics.averageNestingDepth.toFixed(2)}
        </div>
      </div>
      <div className="stat">
        <div className="stat-title">Top-Level Variable Groups</div>
        <div className="stat-value">{structureAnalysis.statistics.totalTopLevelGroups}</div>
        <div className="stat-desc">
          extracted from {structureAnalysis.statistics.componentsWithData} components with data
        </div>
      </div>
    </div>
  )
}
