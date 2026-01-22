"use client"

import { useRouter } from "next/navigation"
import { useStudySetup } from "../../../components/client/StudySetupProvider"
import { useMutation, useQuery } from "@blitzjs/rpc"
import approveExtraction from "../../../mutations/approveExtraction"
import runExtraction from "../../../mutations/runExtraction"
import getCachedExtractionBundle from "../../../queries/getCachedExtractionBundle"
import StepNavigation from "../../../components/client/StepNavigation"
import type { ValidationData } from "../../../../debug/utils/getValidationData"
import { useEffect, useMemo, useState } from "react"
import { Alert } from "@/src/app/components/Alert"
import { AsyncButton } from "@/src/app/components/AsyncButton"
import Card from "@/src/app/components/Card"
import StructureAnalysisCard from "../../../../debug/components/client/structureAnalysis/StructureAnalysisCard"
import { createExtractionIndexStore } from "../../../../variables/utils/extractionIndexStore"
import type { SerializedExtractionBundle } from "../../../utils/serializeExtractionBundle"

interface Step4ContentProps {
  validationData: ValidationData
}

export default function Step4Content({ validationData }: Step4ContentProps) {
  const router = useRouter()
  const { study, studyId } = useStudySetup()
  const [approveExtractionMutation] = useMutation(approveExtraction)
  const [runExtractionMutation] = useMutation(runExtraction)

  const approvedPilotId = validationData.approvedExtraction?.pilotRunIds?.[0] ?? null
  const approvedPilotExists = validationData.pilotResults.some(
    (result) => result.id === approvedPilotId
  )
  const defaultPilotId = approvedPilotExists
    ? approvedPilotId
    : validationData.pilotResults[0]?.id ?? null
  const [selectedResultId, setSelectedResultId] = useState<number | null>(defaultPilotId)
  const [extractionBundle, setExtractionBundle] = useState<SerializedExtractionBundle | null>(null)

  useEffect(() => {
    setExtractionBundle(null)
  }, [selectedResultId])

  const [cachedBundleResult] = useQuery(
    getCachedExtractionBundle,
    {
      studyId,
      testResultId: selectedResultId ?? 0,
      includeDiagnostics: true,
    },
    { enabled: Boolean(selectedResultId) }
  )

  const activeBundle = extractionBundle ?? cachedBundleResult?.bundle ?? null
  const selectedResult = validationData.pilotResults.find((r) => r.id === selectedResultId) ?? null

  const diagnostics = useMemo(() => {
    if (!activeBundle) return null
    return {
      run: activeBundle.diagnostics.run,
      component: new Map(activeBundle.diagnostics.component),
      variable: new Map(activeBundle.diagnostics.variable),
    }
  }, [activeBundle])

  const indexStore = useMemo(() => {
    if (!activeBundle) return null
    return createExtractionIndexStore(activeBundle.observations)
  }, [activeBundle])

  const handleRunExtraction = async () => {
    if (!selectedResultId) return
    try {
      const result = await runExtractionMutation({
        studyId,
        testResultId: selectedResultId,
        includeDiagnostics: true,
      })
      setExtractionBundle(result.bundle)
    } catch (error) {
      console.error("Failed to run extraction:", error)
    }
  }

  const handleComplete = async () => {
    try {
      if (!selectedResultId) {
        throw new Error("No pilot results found to approve")
      }
      await approveExtractionMutation({
        studyId: study.id,
        testResultId: selectedResultId,
      })
      router.refresh()
    } catch (err) {
      console.error("Failed to update step 4 completion:", err)
    }
  }

  return (
    <>
      <Alert variant="info">
        Extraction is currently based on a single pilot result. Choose the pilot data you want to
        use for extraction.
      </Alert>

      <Card title="Select Pilot Data" bgColor="bg-base-200">
        {validationData.pilotResults.length === 0 ? (
          <div className="alert alert-warning">
            <span>No pilot results found. Please complete a pilot run first.</span>
          </div>
        ) : (
          <>
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
          </>
        )}
      </Card>

      {!selectedResult && validationData.pilotResults.length > 0 && (
        <Alert variant="info">Please select a pilot result to continue.</Alert>
      )}

      {selectedResult && !activeBundle && (
        <div className="flex justify-end">
          <AsyncButton
            onClick={handleRunExtraction}
            loadingText="Running extraction..."
            className="btn btn-primary"
          >
            Run Extraction
          </AsyncButton>
        </div>
      )}

      {selectedResult && activeBundle && diagnostics && indexStore && (
        <StructureAnalysisCard
          extractedVariables={activeBundle.variables}
          indexStore={indexStore}
          observations={activeBundle.observations}
          diagnostics={diagnostics}
          enrichedResult={selectedResult}
        />
      )}
      <StepNavigation
        prev="step3"
        next="step5"
        disableNext={!selectedResultId}
        onNext={handleComplete}
        nextLabel={study.step4Completed ? "Continue" : "Approve Extraction"}
      />
    </>
  )
}
