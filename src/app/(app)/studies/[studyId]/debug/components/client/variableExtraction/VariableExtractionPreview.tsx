"use client"

import type { EnrichedJatosStudyResult } from "@/src/types/jatos"
import { DEFAULT_EXTRACTION_CONFIG } from "../../../../variables/types"
import { extractVariableBundle } from "../../../../variables/utils/extractVariable"
import { createObservationStore } from "../../../../variables/utils/observationStore"
import { analyzeDebugStructure } from "../../../../variables/utils/structureAnalyzer/analyzeOriginalStructure"
import Card from "@/src/app/components/Card"
import StructureAnalysisCard from "../structureAnalysis/StructureAnalysisCard"
import VariableStats from "./VariableStats"
import VariableTable from "./VariableTable"
import { useMemo } from "react"

interface VariableExtractionPreviewProps {
  enrichedResult: EnrichedJatosStudyResult
}

export default function VariableExtractionPreview({
  enrichedResult,
}: VariableExtractionPreviewProps) {
  const extractionBundle = useMemo(
    () => extractVariableBundle(enrichedResult, DEFAULT_EXTRACTION_CONFIG),
    [enrichedResult]
  )

  const observationStore = useMemo(
    () => createObservationStore(extractionBundle.observations),
    [extractionBundle.observations]
  )

  // Analyze structure from extraction results
  const debugStructureAnalysis = useMemo(
    () => analyzeDebugStructure(extractionBundle, enrichedResult),
    [extractionBundle, enrichedResult]
  )

  return (
    <div className="space-y-6">
      {/* Structure Analysis Card */}
      <StructureAnalysisCard
        enrichedResult={enrichedResult}
        originalStructureAnalysis={debugStructureAnalysis}
        extractedVariables={extractionBundle.variables}
        observations={extractionBundle.observations}
        diagnostics={extractionBundle.diagnostics}
      />

      {/* Variable Extraction Preview Card */}
      <Card title="Variable Extraction Preview" collapsible defaultOpen={true}>
        <VariableStats extractedVariables={extractionBundle.variables} />

        <VariableTable
          extractedVariables={extractionBundle.variables}
          observationStore={observationStore}
        />
      </Card>
    </div>
  )
}
