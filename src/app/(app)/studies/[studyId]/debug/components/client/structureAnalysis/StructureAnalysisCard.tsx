"use client"

import type { EnrichedJatosStudyResult } from "@/src/types/jatos"
import type { OriginalStructureAnalysis } from "../../../../variables/utils/structureAnalyzer/analyzeOriginalStructure"
import type { ExtractedVariable } from "../../../../variables/types"
import type { PathDisplay } from "../../../types"
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
  // Group by parentKey from extractionMetadata (no structure analysis needed)
  const allExtractedPathsByParentKey = useMemo(() => {
    const variablesByParentKey = new Map<
      string,
      Array<{ variable: ExtractedVariable; componentId: number }>
    >()

    // Group variables by their parentKey from extractionMetadata
    extractedVariables.forEach((variable) => {
      const parentKey = variable.extractionMetadata?.parentKey
      if (!parentKey) return // Skip top-level variables (they don't have a parent)

      // Add for each componentId this variable appears in
      variable.componentIds.forEach((componentId) => {
        if (!variablesByParentKey.has(parentKey)) {
          variablesByParentKey.set(parentKey, [])
        }
        variablesByParentKey.get(parentKey)!.push({ variable, componentId })
      })
    })

    // Convert to the format expected by the UI
    const converted = new Map<string, Array<{ path: PathDisplay; componentId: number }>>()
    variablesByParentKey.forEach((variablesWithComponents, parentKey) => {
      converted.set(
        parentKey,
        variablesWithComponents.map(({ variable, componentId }) => ({
          path: {
            path: variable.variableName,
            type: variable.type as PathDisplay["type"],
            exampleValue: variable.allValues[0] || null,
            depth: variable.extractionMetadata?.depth ?? PathModel.getDepth(variable.variableName),
          },
          componentId,
        }))
      )
    })
    return converted
  }, [extractedVariables])

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
