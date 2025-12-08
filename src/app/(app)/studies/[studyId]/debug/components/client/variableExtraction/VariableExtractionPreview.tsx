"use client"

import type { EnrichedJatosStudyResult } from "@/src/types/jatos"
import { extractVariables } from "../../../../variables/utils/extractVariable"
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
  // Extract variables with full details
  const extractionResult = useMemo(() => extractVariables(enrichedResult), [enrichedResult])
  const extractedVariables = extractionResult.variables
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
        extractedVariables={extractedVariables}
      />

      {/* Variable Extraction Preview Card */}
      <Card title="Variable Extraction Preview" collapsible defaultOpen={true}>
        <VariableStats extractedVariables={extractedVariables} />

        <VariableTable extractedVariables={extractedVariables} />

        <WarningsList warnings={extractionResult.warnings} />

        <SkippedValuesTable skippedValues={extractionResult.skippedValues} />
      </Card>
    </div>
  )
}
