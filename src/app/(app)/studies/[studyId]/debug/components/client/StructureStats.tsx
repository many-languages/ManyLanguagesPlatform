"use client"

import type { OriginalStructureAnalysis } from "../../../variables/utils/structureAnalyzer/analyzeOriginalStructure"

interface StructureStatsProps {
  originalStructureAnalysis: OriginalStructureAnalysis
}

export default function StructureStats({ originalStructureAnalysis }: StructureStatsProps) {
  return (
    <div className="stats stats-vertical lg:stats-horizontal shadow w-full">
      <div className="stat">
        <div className="stat-title">Data Structure</div>
        <div className="stat-value text-primary capitalize">
          {originalStructureAnalysis.structureType}
        </div>
      </div>
      <div className="stat">
        <div className="stat-title">Max Nesting Depth</div>
        <div className="stat-value text-secondary">
          {originalStructureAnalysis.statistics.maxNestingDepth}
        </div>
        <div className="stat-desc">
          Average: {originalStructureAnalysis.statistics.averageNestingDepth.toFixed(2)}
        </div>
      </div>
      <div className="stat">
        <div className="stat-title">Top-Level Variable Groups</div>
        <div className="stat-value">{originalStructureAnalysis.statistics.totalTopLevelGroups}</div>
        <div className="stat-desc">
          extracted from {originalStructureAnalysis.statistics.componentsWithData} components with
          data
        </div>
      </div>
    </div>
  )
}
