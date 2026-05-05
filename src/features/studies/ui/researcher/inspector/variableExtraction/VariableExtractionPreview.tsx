"use client"

import type { EnrichedJatosStudyResult } from "@/src/types/jatos"
import { extractVariableBundle } from "../../../../domain/variables/utils/extractVariable"
import { DEFAULT_EXTRACTION_CONFIG } from "../../../../domain/variables/types"
import { createExtractionIndexStore } from "../../../../domain/variables/utils/extractionIndexStore"
import Card from "@/src/app/components/Card"
import StructureAnalysisCard from "../structureAnalysis/StructureAnalysisCard"
import StructureDiagnostics from "../structureAnalysis/StructureDiagnostics"
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
        enrichedResult={enrichedResult}
      />

      {/* Diagnostics Card */}
      <Card title="Diagnostics" collapsible defaultOpen={true}>
        <StructureDiagnostics diagnostics={extractionBundle.diagnostics} />
      </Card>

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
