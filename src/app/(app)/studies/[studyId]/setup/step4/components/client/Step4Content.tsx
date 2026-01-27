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
  const latestUpload = study.latestJatosStudyUpload
  const step4Completed = latestUpload?.step4Completed ?? false

  const hasPilotResults = validationData.pilotResults.length > 0
  const previewResult = validationData.pilotResults[0] ?? null
  const [extractionBundle, setExtractionBundle] = useState<SerializedExtractionBundle | null>(null)

  useEffect(() => {
    setExtractionBundle(null)
  }, [hasPilotResults])

  const [cachedBundleResult] = useQuery(
    getCachedExtractionBundle,
    {
      studyId,
      includeDiagnostics: true,
    },
    { enabled: hasPilotResults }
  )

  const activeBundle = extractionBundle ?? cachedBundleResult?.bundle ?? null
  const selectedResult = previewResult

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
    try {
      const result = await runExtractionMutation({
        studyId,
        includeDiagnostics: true,
      })
      setExtractionBundle(result.bundle)
    } catch (error) {
      console.error("Failed to run extraction:", error)
    }
  }

  const handleComplete = async () => {
    try {
      if (step4Completed) {
        router.push(`/studies/${studyId}/setup/step5`)
        return
      }
      await approveExtractionMutation({
        studyId: study.id,
      })
      router.refresh()
      router.push(`/studies/${studyId}/setup/step5`)
    } catch (err) {
      console.error("Failed to update step 4 completion:", err)
    }
  }

  if (!hasPilotResults) {
    return (
      <>
        <Alert variant="info">
          Extraction is based on all pilot results for the latest study upload.
        </Alert>
        <Card title="Pilot Data Required" bgColor="bg-base-200">
          <div className="alert alert-warning">
            <span>
              No pilot results found for this study version. Please collect pilot responses first.
            </span>
          </div>
          <div className="mt-4 flex justify-end">
            <AsyncButton
              onClick={() => router.push(`/studies/${studyId}/setup/step3`)}
              className="btn btn-primary"
            >
              Go to Step 3
            </AsyncButton>
          </div>
        </Card>
      </>
    )
  }

  return (
    <>
      <Alert variant="info">
        Extraction is based on all pilot results for the latest study upload.
      </Alert>

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
        disableNext={!hasPilotResults}
        onNext={handleComplete}
        nextLabel={step4Completed ? "Continue" : "Approve Extraction"}
      />
    </>
  )
}
