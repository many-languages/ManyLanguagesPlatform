"use client"

import type { EnrichedJatosStudyResult } from "@/src/types/jatos"
import type {
  Diagnostic,
  ExtractedVariable,
  ExtractionObservation,
} from "../../../../variables/types"
import type { ExtractionIndexStore } from "../../../../variables/utils/extractionIndexStore"
import type { HighlightedPaths, SelectedPath } from "../../../types"
import Card from "@/src/app/components/Card"
import { useState, useCallback } from "react"
import StructureComponents from "./StructureComponents"
import StructureDiagnostics from "./StructureDiagnostics"

interface StructureAnalysisCardProps {
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
  extractedVariables,
  indexStore,
  observations,
  diagnostics,
  enrichedResult,
}: StructureAnalysisCardProps) {
  const [analysisTab, setAnalysisTab] = useState<"components" | "diagnostics">("components")

  // Find first component with observations (has data) - lazy initial state
  const [selectedComponentId, setSelectedComponentId] = useState<number | "all" | null>(() => {
    const componentsWithData = enrichedResult.componentResults.filter((c) => c.dataContent)
    for (const component of componentsWithData) {
      const obsIndices = indexStore.getObservationIndicesByComponentId(component.componentId)
      if (obsIndices.length > 0) {
        return component.componentId
      }
    }
    return "all"
  })
  const [selectedPath, setSelectedPath] = useState<SelectedPath | null>(null)
  const [highlightedPaths, setHighlightedPaths] = useState<HighlightedPaths | null>(null)

  // Handler to extract example paths from variable and highlight
  // Receives variableKey (structural identifier) directly, no lookup needed
  const handleVariableClick = useCallback(
    (variableKey: string, componentId: number) => {
      const variable = extractedVariables.find((v) => v.variableKey === variableKey)
      if (!variable) {
        // If not a variable, clear selection
        setSelectedPath(null)
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
          className={`tab ${analysisTab === "components" ? "tab-active" : ""}`}
          onClick={() => setAnalysisTab("components")}
        >
          Components
        </button>
        <button
          className={`tab ${analysisTab === "diagnostics" ? "tab-active" : ""}`}
          onClick={() => setAnalysisTab("diagnostics")}
        >
          Diagnostics
        </button>
      </div>

      {/* Components Tab */}
      {analysisTab === "components" && (
        <StructureComponents
          enrichedResult={enrichedResult}
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
