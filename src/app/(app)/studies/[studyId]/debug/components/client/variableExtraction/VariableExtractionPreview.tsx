"use client"

import type { EnrichedJatosStudyResult } from "@/src/types/jatos"
import { DEFAULT_EXTRACTION_CONFIG } from "../../../../variables/types"
import { extractVariableBundle } from "../../../../variables/utils/extractVariable"
import { createExtractionIndexStore } from "../../../../variables/utils/extractionIndexStore"
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

  const indexStore = useMemo(
    () => createExtractionIndexStore(extractionBundle.observations),
    [extractionBundle.observations]
  )

  return (
    <div className="space-y-6">
      {/* Structure Analysis Card */}
      <StructureAnalysisCard
        extractedVariables={extractionBundle.variables}
        indexStore={indexStore}
        observations={extractionBundle.observations}
        diagnostics={extractionBundle.diagnostics}
        enrichedResult={enrichedResult}
      />

      {/* Variable Extraction Preview Card */}
      <Card title="Variable Extraction Preview" collapsible defaultOpen={true}>
        <VariableStats extractedVariables={extractionBundle.variables} />

        <VariableTable
          extractedVariables={extractionBundle.variables}
          indexStore={indexStore}
          observations={extractionBundle.observations}
        />
      </Card>
    </div>
  )
}
