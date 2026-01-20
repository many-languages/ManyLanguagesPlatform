"use client"

import type { EnrichedJatosStudyResult } from "@/src/types/jatos"
import type { DebugViewMaterialized } from "../../../utils/materializeDebugView"
import type {
  Diagnostic,
  ExtractedVariable,
  ExtractionObservation,
} from "../../../../variables/types"
import type { ExtractionIndexStore } from "../../../../variables/utils/extractionIndexStore"
import type { HighlightedPaths, SelectedPath } from "../../../types"
import Card from "@/src/app/components/Card"
import { useState, useCallback } from "react"
import { useTopLevelGroups } from "../../../hooks/useTopLevelGroups"
import StructureOverview from "./StructureOverview"
import StructureComponents from "./StructureComponents"
import StructureDiagnostics from "./StructureDiagnostics"

interface StructureAnalysisCardProps {
  debugView: DebugViewMaterialized
  extractedVariables: ExtractedVariable[]
  indexStore: ExtractionIndexStore
  observations: ExtractionObservation[]
  diagnostics: {
    run: Diagnostic[]
    component: Map<number, Diagnostic[]>
    variable: Map<string, { variableName: string; diagnostics: Diagnostic[] }>
  }
  enrichedResult: EnrichedJatosStudyResult
}

export default function StructureAnalysisCard({
  debugView,
  extractedVariables,
  indexStore,
  observations,
  diagnostics,
  enrichedResult,
}: StructureAnalysisCardProps) {
  const [analysisTab, setAnalysisTab] = useState<"overview" | "components" | "diagnostics">(
    "overview"
  )
  const [selectedComponentId, setSelectedComponentId] = useState<number | "all" | null>(
    debugView.structure.components.find(
      (c) => c.structureType !== "null" && c.structureType !== "empty"
    )?.componentId ?? "all"
  )
  const [selectedPath, setSelectedPath] = useState<SelectedPath | null>(null)
  const [highlightedPaths, setHighlightedPaths] = useState<HighlightedPaths | null>(null)

  // Compute top-level groups with variables and their types
  const topLevelGroups = useTopLevelGroups(extractedVariables, indexStore, observations)

  // Handler to extract example paths from variable and highlight
  // Receives variableKey (structural identifier) directly, no lookup needed
  const handleVariableClick = useCallback(
    (variableKey: string, componentId: number) => {
      // Check if this is a variable (has $ prefix) or a top-level key
      const variable = extractedVariables.find((v) => v.variableKey === variableKey)
      if (!variable) {
        // Fallback: use the path directly if not a variable (top-level key)
        setSelectedPath({ selectedPath: variableKey, componentId })
        setHighlightedPaths(null)
        return
      }

      const indices = indexStore.getObservationIndicesByVariableKey(variableKey)
      const allObservationPaths: string[] = []
      for (const index of indices) {
        const obs = observations[index]
        if (obs && obs.scopeKeys.componentId === componentId) {
          allObservationPaths.push(obs.path)
        }
      }

      setSelectedPath({ selectedPath: variableKey, componentId })
      setHighlightedPaths({
        componentId,
        jsonPaths: allObservationPaths,
      })
    },
    [extractedVariables, indexStore, observations]
  )

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
          Components ({debugView.structure.components.length})
        </button>
        <button
          className={`tab ${analysisTab === "diagnostics" ? "tab-active" : ""}`}
          onClick={() => setAnalysisTab("diagnostics")}
        >
          Diagnostics
        </button>
      </div>

      {/* Overview Tab */}
      {analysisTab === "overview" && (
        <StructureOverview
          structureAnalysis={debugView.structure}
          topLevelGroups={topLevelGroups}
          selectedPath={selectedPath}
          onSwitchToComponents={() => setAnalysisTab("components")}
          onSelectComponent={(componentId) => setSelectedComponentId(componentId)}
          onHighlightPath={handleVariableClick}
        />
      )}

      {/* Components Tab */}
      {analysisTab === "components" && (
        <StructureComponents
          enrichedResult={enrichedResult}
          structureAnalysis={debugView.structure}
          extractedVariables={extractedVariables}
          selectedComponentId={selectedComponentId}
          selectedPath={selectedPath}
          highlightedPaths={highlightedPaths}
          onSelectComponent={(componentId) => setSelectedComponentId(componentId)}
          onHighlightPath={handleVariableClick}
        />
      )}

      {/* Diagnostics Tab */}
      {analysisTab === "diagnostics" && <StructureDiagnostics diagnostics={diagnostics} />}
    </Card>
  )
}
