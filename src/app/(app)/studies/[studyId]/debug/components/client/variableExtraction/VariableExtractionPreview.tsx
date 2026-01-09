"use client"

import type { EnrichedJatosStudyResult } from "@/src/types/jatos"
import {
  extractObservations,
  aggregateVariables,
  extractVariables,
} from "../../../../variables/utils/extractVariable"
import { createObservationStore } from "../../../../variables/utils/observationStore"
import { analyzeOriginalStructure } from "../../../../variables/utils/structureAnalyzer/analyzeOriginalStructure"
import Card from "@/src/app/components/Card"
import StructureAnalysisCard from "../structureAnalysis/StructureAnalysisCard"
import VariableStats from "./VariableStats"
import VariableTable from "./VariableTable"
import WarningsList from "./WarningsList"
import SkippedValuesTable from "./SkippedValuesTable"
import { useMemo } from "react"

interface VariableExtractionPreviewProps {
  enrichedResult: EnrichedJatosStudyResult
}

export default function VariableExtractionPreview({
  enrichedResult,
}: VariableExtractionPreviewProps) {
  // Extract observations and variables separately for debug view
  const extractionData = useMemo(() => {
    const observationsResult = extractObservations(enrichedResult)
    const variables = aggregateVariables(observationsResult)
    const observationStore = createObservationStore(observationsResult.observations)
    return { observations: observationsResult.observations, variables, observationStore }
  }, [enrichedResult])

  // Also get extraction result for warnings/skipped values
  const extractionResult = useMemo(() => extractVariables(enrichedResult), [enrichedResult])

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

        <SkippedValuesTable skippedValues={extractionResult.skippedValues} />
      </Card>
    </div>
  )
}
