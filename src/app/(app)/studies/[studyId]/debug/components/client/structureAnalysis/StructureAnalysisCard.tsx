"use client"

import type { EnrichedJatosStudyResult } from "@/src/types/jatos"
import type {
  Diagnostic,
  ExtractedVariable,
  ExtractionObservation,
} from "../../../../variables/types"
import type { ExtractionIndexStore } from "../../../../variables/utils/extractionIndexStore"
import type { SelectedPath } from "../../../types"
import Card from "@/src/app/components/Card"
import { useState, useCallback, useMemo } from "react"
import StructureComponents from "./StructureComponents"
import StructureDiagnostics from "./StructureDiagnostics"
import { createComponentExplorerModel } from "../../../utils/createComponentExplorerModel"

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

  // Build the joined explorer model once
  const componentExplorer = useMemo(() => {
    return createComponentExplorerModel({
      enrichedResult,
      extractedVariables,
      observations,
      indexStore,
    })
  }, [enrichedResult, extractedVariables, observations, indexStore])

  // Initial selection: first component with any observations, else "all"
  const [selectedComponentId, setSelectedComponentId] = useState<number | "all" | null>(
    () => componentExplorer.firstComponentId ?? "all"
  )

  // Selected variable (and component it applies to)
  const [selectedPath, setSelectedPath] = useState<SelectedPath | null>(null)

  const handleVariableClick = useCallback((variableKey: string, componentId: number) => {
    setSelectedPath({ selectedPath: variableKey, componentId })
  }, [])

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
          componentExplorer={componentExplorer}
          selectedComponentId={selectedComponentId}
          selectedPath={selectedPath}
          onSelectComponent={setSelectedComponentId}
          onHighlightPath={handleVariableClick}
        />
      )}

      {/* Diagnostics Tab */}
      {analysisTab === "diagnostics" && <StructureDiagnostics diagnostics={diagnostics} />}
    </Card>
  )
}
