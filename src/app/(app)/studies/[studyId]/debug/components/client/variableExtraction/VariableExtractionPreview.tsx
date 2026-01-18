"use client"

import type { EnrichedJatosStudyResult } from "@/src/types/jatos"
import { DEFAULT_EXTRACTION_CONFIG } from "../../../../variables/types"
import { extractVariables } from "../../../../variables/utils/extractVariable"
import { extractObservations } from "../../../../variables/utils/extractObservations"
import { aggregateVariables } from "../../../../variables/utils/aggregateVariables"
import { createObservationStore } from "../../../../variables/utils/observationStore"
import { analyzeOriginalStructure } from "../../../../variables/utils/structureAnalyzer/analyzeOriginalStructure"
import Card from "@/src/app/components/Card"
import StructureAnalysisCard from "../structureAnalysis/StructureAnalysisCard"
import VariableStats from "./VariableStats"
import VariableTable from "./VariableTable"
import WarningsList from "./WarningsList"
import { useMemo } from "react"

interface VariableExtractionPreviewProps {
  enrichedResult: EnrichedJatosStudyResult
}

export default function VariableExtractionPreview({
  enrichedResult,
}: VariableExtractionPreviewProps) {
  // Extract observations and variables separately for debug view
  const extractionData = useMemo(() => {
    const observationsResult = extractObservations(enrichedResult, DEFAULT_EXTRACTION_CONFIG)
    const variables = aggregateVariables(
      observationsResult.observations,
      observationsResult.variableFacts,
      DEFAULT_EXTRACTION_CONFIG
    )
    const observationStore = createObservationStore(observationsResult.observations)
    return { observations: observationsResult.observations, variables, observationStore }
  }, [enrichedResult])

  // Also get extraction result for warnings
  const extractionResult = useMemo(
    () => extractVariables(enrichedResult, DEFAULT_EXTRACTION_CONFIG),
    [enrichedResult]
  )

  // Create original structure analysis
  const originalStructureAnalysis = useMemo(
    () => analyzeOriginalStructure(enrichedResult),
    [enrichedResult]
  )

  return (
    <div className="space-y-6">
      {/* Structure Analysis Card */}
      <StructureAnalysisCard
        enrichedResult={enrichedResult}
        originalStructureAnalysis={originalStructureAnalysis}
        extractedVariables={extractionData.variables}
        observations={extractionData.observations}
      />

      {/* Variable Extraction Preview Card */}
      <Card title="Variable Extraction Preview" collapsible defaultOpen={true}>
        <VariableStats extractedVariables={extractionData.variables} />

        <VariableTable
          extractedVariables={extractionData.variables}
          observationStore={extractionData.observationStore}
        />

        <WarningsList
          diagnostics={[
            ...extractionResult.runDiagnostics,
            ...Array.from(extractionResult.componentDiagnostics.values()).flat(),
          ]}
        />
      </Card>
    </div>
  )
}
