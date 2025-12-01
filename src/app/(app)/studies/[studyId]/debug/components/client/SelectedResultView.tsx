"use client"

import type { EnrichedJatosStudyResult } from "@/src/types/jatos"
import Card from "@/src/app/components/Card"
import ComponentResultExplorer from "./ComponentResultExplorer"
import VariableExtractionPreview from "./VariableExtractionPreview"

interface SelectedResultViewProps {
  selectedResult: EnrichedJatosStudyResult
}

export default function SelectedResultView({ selectedResult }: SelectedResultViewProps) {
  return (
    <div className="space-y-6">
      {/* Result Header */}
      <Card
        title={`Test Result #${selectedResult.id} - ${selectedResult.studyCode}`}
        bgColor="bg-base-200"
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
          <div>
            <span className="font-medium">State:</span>{" "}
            <span className="badge badge-sm">{selectedResult.studyState}</span>
          </div>
          <div>
            <span className="font-medium">Worker Type:</span> {selectedResult.workerType}
          </div>
          <div>
            <span className="font-medium">Duration:</span> {selectedResult.duration}
          </div>
          <div>
            <span className="font-medium">Components:</span>{" "}
            {selectedResult.componentResults.length}
          </div>
        </div>
      </Card>

      {/* Component Result Explorer */}
      <ComponentResultExplorer enrichedResult={selectedResult} />

      {/* Variable Extraction Preview */}
      <VariableExtractionPreview enrichedResult={selectedResult} />
    </div>
  )
}
