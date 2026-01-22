"use client"

import type { ValidationData } from "../../utils/getValidationData"
import MetadataViewer from "./MetadataViewer"
import StudyPropertiesViewer from "./StudyPropertiesViewer"
import SelectedResultView from "./SelectedResultView"
import Card from "@/src/app/components/Card"
import { useState } from "react"
import StudyHeader from "./StudyHeader"
import { Study } from "@/db"

interface DebugContentProps {
  validationData: ValidationData
}

export default function DebugContent({ validationData }: DebugContentProps) {
  const [selectedResultId, setSelectedResultId] = useState<number | null>(
    validationData.pilotResults[0]?.id ?? null
  )

  const selectedResult = validationData.pilotResults.find((r) => r.id === selectedResultId)

  return (
    <div className="space-y-6">
      {/* Study-Level Information Section */}
      <div className="space-y-6">
        {/* Study Info */}
        <StudyHeader study={validationData.study as Study} />
        {/* Study Properties Viewer */}
        <StudyPropertiesViewer properties={validationData.properties} />
        {/* Metadata Viewer */}
        <MetadataViewer metadata={validationData.metadata} />
      </div>

      {/* Divider */}
      <div className="divider">
        <span className="text-lg font-semibold">Test Result Data</span>
      </div>

      {/* Test Result Selector */}
      {validationData.pilotResults.length > 0 && (
        <Card title="Select Pilot Result" bgColor="bg-base-200">
          <select
            className="select select-bordered w-full"
            value={selectedResultId ?? ""}
            onChange={(e) => setSelectedResultId(Number(e.target.value) || null)}
          >
            <option value="">Select a pilot result...</option>
            {validationData.pilotResults.map((result) => (
              <option key={result.id} value={result.id}>
                Result #{result.id} - {result.studyCode} (Started:{" "}
                {new Date(result.startDate).toLocaleString()})
              </option>
            ))}
          </select>
          <p className="text-sm text-muted-content mt-2">
            {validationData.pilotResults.length} pilot result
            {validationData.pilotResults.length !== 1 ? "s" : ""} available
          </p>
        </Card>
      )}

      {!selectedResult && validationData.pilotResults.length > 0 && (
        <div className="alert alert-info">
          <span>Please select a pilot result to view details</span>
        </div>
      )}

      {validationData.pilotResults.length === 0 && (
        <div className="alert alert-warning">
          <span>No pilot results found. Please complete a pilot run first.</span>
        </div>
      )}

      {/* Selected Test Result Information Section */}
      {selectedResult && <SelectedResultView selectedResult={selectedResult} />}
    </div>
  )
}
