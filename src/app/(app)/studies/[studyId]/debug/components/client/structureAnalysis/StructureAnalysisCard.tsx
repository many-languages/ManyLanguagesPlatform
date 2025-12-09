"use client"

import type { EnrichedJatosStudyResult } from "@/src/types/jatos"
import type { OriginalStructureAnalysis } from "../../../../variables/utils/structureAnalyzer/analyzeOriginalStructure"
import type { ExtractedVariable } from "../../../../variables/types"
import type { PathDisplay } from "../../../types"
import { aggregateVariablesByParentKey } from "../../../../variables/utils/componentPathExtractor"
import Card from "@/src/app/components/Card"
import { useState, useMemo } from "react"
import StructureOverview from "./StructureOverview"
import StructureComponents from "./StructureComponents"

interface StructureAnalysisCardProps {
  enrichedResult: EnrichedJatosStudyResult
  originalStructureAnalysis: OriginalStructureAnalysis
  extractedVariables: ExtractedVariable[]
}

export default function StructureAnalysisCard({
  enrichedResult,
  originalStructureAnalysis,
  extractedVariables,
}: StructureAnalysisCardProps) {
  const [analysisTab, setAnalysisTab] = useState<"overview" | "components">("overview")
  const [selectedComponentId, setSelectedComponentId] = useState<number | "all" | null>(
    enrichedResult.componentResults.find((c) => c.dataContent)?.componentId ?? "all"
  )
  const [highlightedPath, setHighlightedPath] = useState<{
    path: string
    componentId: number
  } | null>(null)

  // Collect all extracted paths from all components for the overview
  const allExtractedPathsByParentKey = useMemo(() => {
    const variablesByParentKey = aggregateVariablesByParentKey(
      extractedVariables,
      originalStructureAnalysis
    )
    // Convert to the format expected by the UI
    const converted = new Map<string, Array<{ path: PathDisplay; componentId: number }>>()
    variablesByParentKey.forEach((variablesWithComponents, parentKey) => {
      converted.set(
        parentKey,
        variablesWithComponents.map(({ variable, componentId }) => ({
          path: {
            path: variable.variableName,
            type: (variable.type === "primitive" ? "string" : variable.type) as PathDisplay["type"],
            exampleValue: variable.allValues[0] || null,
            depth:
              variable.variableName.split(".").length + variable.variableName.split("[").length - 1,
          },
          componentId,
        }))
      )
    })
    return converted
  }, [extractedVariables, originalStructureAnalysis])

  return (
    <Card title="Structure Analysis" collapsible defaultOpen={true}>
      {/* Analysis Tabs */}
      <div className="tabs tabs-boxed mb-4">
        <button
          className={`tab ${analysisTab === "overview" ? "tab-active" : ""}`}
          onClick={() => setAnalysisTab("overview")}
        >
          Overview
        </button>
        <button
          className={`tab ${analysisTab === "components" ? "tab-active" : ""}`}
          onClick={() => setAnalysisTab("components")}
        >
          Components ({originalStructureAnalysis.components.length})
        </button>
      </div>

      {/* Overview Tab */}
      {analysisTab === "overview" && (
        <StructureOverview
          enrichedResult={enrichedResult}
          originalStructureAnalysis={originalStructureAnalysis}
          allExtractedPathsByParentKey={allExtractedPathsByParentKey}
          highlightedPath={highlightedPath}
          onSwitchToComponents={() => setAnalysisTab("components")}
          onSelectComponent={(componentId) => setSelectedComponentId(componentId)}
          onHighlightPath={(path, componentId) => setHighlightedPath({ path, componentId })}
        />
      )}

      {/* Components Tab */}
      {analysisTab === "components" && (
        <StructureComponents
          enrichedResult={enrichedResult}
          originalStructureAnalysis={originalStructureAnalysis}
          extractedVariables={extractedVariables}
          selectedComponentId={selectedComponentId}
          highlightedPath={highlightedPath}
          onSelectComponent={(componentId) => setSelectedComponentId(componentId)}
          onHighlightPath={(path, componentId) => setHighlightedPath({ path, componentId })}
        />
      )}
    </Card>
  )
}
