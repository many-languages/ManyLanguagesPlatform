"use client"

import type { ValidationData } from "../../utils/getValidationData"
import MetadataViewer from "./MetadataViewer"
import StudyPropertiesViewer from "./StudyPropertiesViewer"
import VariableExtractionPreview from "./VariableExtractionPreview"
import ComponentResultExplorer from "./ComponentResultExplorer"
import { useState } from "react"

interface DebugContentProps {
  validationData: ValidationData
}

export default function DebugContent({ validationData }: DebugContentProps) {
  const [selectedResultId, setSelectedResultId] = useState<number | null>(
    validationData.testResults[0]?.id ?? null
  )

  const selectedResult = validationData.testResults.find((r) => r.id === selectedResultId)

  return (
    <div className="space-y-6">
      {/* Study-Level Information Section */}
      <div className="space-y-6">
        {/* Study Info */}
        <div className="card bg-base-200 p-4">
          <h2 className="text-xl font-semibold mb-2">{validationData.study.title}</h2>
          <p className="text-sm text-muted-content">
            JATOS Study ID: {validationData.study.jatosStudyId} | Study ID:{" "}
            {validationData.study.id}
            {validationData.study.jatosStudyUUID && (
              <> | UUID: {validationData.study.jatosStudyUUID}</>
            )}
          </p>
          <p className="text-sm text-muted-content">
            Test Results Found: {validationData.testResults.length}
          </p>
        </div>

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
      {validationData.testResults.length > 0 && (
        <div className="card bg-base-200 p-4">
          <label className="label">
            <span className="label-text font-semibold">Select Test Result</span>
          </label>
          <select
            className="select select-bordered w-full"
            value={selectedResultId ?? ""}
            onChange={(e) => setSelectedResultId(Number(e.target.value) || null)}
          >
            <option value="">Select a test result...</option>
            {validationData.testResults.map((result) => (
              <option key={result.id} value={result.id}>
                Result #{result.id} - {result.studyCode} (Started:{" "}
                {new Date(result.startDate).toLocaleString()})
              </option>
            ))}
          </select>
        </div>
      )}

      {!selectedResult && validationData.testResults.length > 0 && (
        <div className="alert alert-info">
          <span>Please select a test result to view details</span>
        </div>
      )}

      {validationData.testResults.length === 0 && (
        <div className="alert alert-warning">
          <span>No test results found. Please complete a test run first.</span>
        </div>
      )}

      {/* Selected Test Result Information Section */}
      {selectedResult && (
        <div className="space-y-6">
          {/* Result Header */}
          <div className="card bg-base-200 p-4">
            <h3 className="text-lg font-semibold mb-2">
              Test Result #{selectedResult.id} - {selectedResult.studyCode}
            </h3>
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
          </div>

          {/* Component Result Explorer */}
          <ComponentResultExplorer
            enrichedResult={selectedResult}
            onComponentSelect={(componentId) => {
              // Handle component selection if needed
              console.log("Selected component:", componentId)
            }}
          />

          {/* Variable Extraction Preview */}
          <VariableExtractionPreview enrichedResult={selectedResult} />
        </div>
      )}
    </div>
  )
}
