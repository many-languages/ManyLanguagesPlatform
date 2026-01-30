"use client"

import type { EnrichedJatosStudyResult } from "@/src/types/jatos"
import type { ExtractedVariable, ExtractionObservation } from "../../../../variables/types"
import type { ExtractionIndexStore } from "../../../../variables/utils/extractionIndexStore"
import type { SelectedPath } from "../../../types"
import Card from "@/src/app/components/Card"
import clsx from "clsx"
import { useState, useCallback, useMemo } from "react"
import StructureComponents from "./StructureComponents"
import { createComponentExplorerModel } from "../../../utils/createComponentExplorerModel"

interface StructureAnalysisCardProps {
  extractedVariables: ExtractedVariable[]
  indexStore: ExtractionIndexStore
  observations: ExtractionObservation[]
  enrichedResult: EnrichedJatosStudyResult
  bgColor?: string
  title?: string | null
}

export default function StructureAnalysisCard({
  extractedVariables,
  indexStore,
  observations,
  enrichedResult,
  bgColor = "bg-base-200",
  title = "Structure Analysis",
}: StructureAnalysisCardProps) {
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

  const content = (
    <StructureComponents
      componentExplorer={componentExplorer}
      selectedComponentId={selectedComponentId}
      selectedPath={selectedPath}
      onSelectComponent={setSelectedComponentId}
      onHighlightPath={handleVariableClick}
    />
  )

  if (title === null) {
    return (
      <div className={clsx("mt-2 rounded-box border border-base-300 px-6 py-4", bgColor)}>
        {content}
      </div>
    )
  }

  return (
    <Card title={title} collapsible defaultOpen={true} bgColor={bgColor}>
      {content}
    </Card>
  )
}
