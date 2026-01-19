"use client"

import type { EnrichedJatosStudyResult } from "@/src/types/jatos"
import type { DebugStructureAnalysis } from "../../../../variables/utils/structureAnalyzer/analyzeOriginalStructure"
import type { ExtractedVariable } from "../../../../variables/types"
import type { PathDisplay } from "../../../types"
import StructureStats from "./StructureStats"
import TopLevelGroups from "./TopLevelGroups"
import ExtractedVariablesOverview from "./ExtractedVariablesOverview"
import DetectedPatterns from "./DetectedPatterns"
import { scrollToComponentData } from "../../../utils/pathHighlighting"

interface StructureOverviewProps {
  enrichedResult: EnrichedJatosStudyResult
  originalStructureAnalysis: DebugStructureAnalysis
  allExtractedPathsByParentKey: Map<string, Array<{ path: PathDisplay; componentId: number }>>
  extractedVariables: ExtractedVariable[]
  highlightedPath?: { path: string; componentId: number } | null
  onSwitchToComponents: () => void
  onSelectComponent: (componentId: number) => void
  onHighlightPath: (path: string, componentId: number) => void
}

export default function StructureOverview({
  enrichedResult,
  originalStructureAnalysis,
  allExtractedPathsByParentKey,
  extractedVariables,
  highlightedPath,
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
      <StructureStats originalStructureAnalysis={originalStructureAnalysis} />

      <TopLevelGroups
        enrichedResult={enrichedResult}
        originalStructureAnalysis={originalStructureAnalysis}
        highlightedPath={highlightedPath}
        onPathClick={handlePathClick}
      />

      <ExtractedVariablesOverview
        allExtractedPathsByParentKey={allExtractedPathsByParentKey}
        extractedVariables={extractedVariables}
        highlightedPath={highlightedPath}
        onPathClick={handlePathClick}
      />

      <DetectedPatterns patterns={originalStructureAnalysis.patterns} />
    </div>
  )
}
