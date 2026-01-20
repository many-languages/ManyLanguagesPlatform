"use client"

import type { DebugStructureAnalysis } from "../../../utils/materializeDebugView"
import type { SelectedPath, TopLevelGroup } from "../../../types"
import StructureStats from "./StructureStats"
import TopLevelGroups from "./TopLevelGroups"
import ExtractedVariablesOverview from "./ExtractedVariablesOverview"
import DetectedPatterns from "./DetectedPatterns"
import { scrollToComponentData } from "../../../utils/pathHighlighting"

interface StructureOverviewProps {
  structureAnalysis: DebugStructureAnalysis
  topLevelGroups: Map<string, TopLevelGroup>
  selectedPath?: SelectedPath | null
  onSwitchToComponents: () => void
  onSelectComponent: (componentId: number) => void
  onHighlightPath: (path: string, componentId: number) => void
}

export default function StructureOverview({
  structureAnalysis,
  topLevelGroups,
  selectedPath,
  onSwitchToComponents,
  onSelectComponent,
  onHighlightPath,
}: StructureOverviewProps) {
  const handlePathClick = (path: string, componentId: number) => {
    onSwitchToComponents()
    onSelectComponent(componentId)
    onHighlightPath(path, componentId)
    scrollToComponentData(componentId, 200)
  }

  return (
    <div className="space-y-4">
      <StructureStats structureAnalysis={structureAnalysis} />

      <TopLevelGroups
        structureAnalysis={structureAnalysis}
        topLevelGroups={topLevelGroups}
        selectedPath={selectedPath}
        onPathClick={handlePathClick}
      />

      <ExtractedVariablesOverview
        topLevelGroups={topLevelGroups}
        selectedPath={selectedPath}
        onPathClick={handlePathClick}
      />

      <DetectedPatterns patterns={structureAnalysis.patterns} />
    </div>
  )
}
