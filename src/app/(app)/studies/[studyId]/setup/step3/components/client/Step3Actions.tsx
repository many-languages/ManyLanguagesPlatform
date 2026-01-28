"use client"

import { ArrowPathIcon } from "@heroicons/react/24/outline"
import { Alert } from "@/src/app/components/Alert"
import { AsyncButton } from "@/src/app/components/AsyncButton"
import RunPilotButton from "./RunPilotButton"
import GeneratePilotLinkButton from "./GeneratePilotLinkButton"

interface Step3ActionsProps {
  pilotCompleted: boolean | null
  jatosRunUrl: string | null
  researcherId: number // Required - Step3Content returns early if null
  jatosStudyUploadId: number | null
  jatosStudyId: number | null
  jatosBatchId: number | null
  jatosStudyUUID: string | null
  onCheckStatus: () => Promise<void>
  onPilotLinkGenerated?: (runUrl: string) => void | Promise<void>
}

export default function Step3Actions({
  pilotCompleted,
  jatosRunUrl,
  researcherId,
  jatosStudyUploadId,
  jatosStudyId,
  jatosBatchId,
  jatosStudyUUID,
  onCheckStatus,
  onPilotLinkGenerated,
}: Step3ActionsProps) {
  if (!jatosStudyUploadId || !jatosStudyId || !jatosBatchId) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Alert variant="warning">
          <p>Please complete Step 2 (JATOS setup) first.</p>
        </Alert>
      </div>
    )
  }

  if (!jatosRunUrl) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Generate Pilot Link button when no link exists */}
        <div className="flex justify-center">
          <GeneratePilotLinkButton
            studyResearcherId={researcherId}
            jatosStudyUploadId={jatosStudyUploadId}
            jatosStudyId={jatosStudyId}
            jatosBatchId={jatosBatchId}
            onGenerated={onPilotLinkGenerated}
            label="Generate Pilot Link"
            className="btn btn-primary btn-lg"
          />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 w-full">
      {/* Actions Section - Generate Pilot Link (if completed), Run Study and Check Status */}
      <div className="flex flex-wrap items-center justify-center gap-4 w-full">
        {pilotCompleted === true && jatosStudyId && jatosBatchId && (
          <>
            <div className="flex-shrink-0">
              <GeneratePilotLinkButton
                studyResearcherId={researcherId}
                jatosStudyUploadId={jatosStudyUploadId}
                jatosStudyId={jatosStudyId}
                jatosBatchId={jatosBatchId}
                onGenerated={onPilotLinkGenerated}
                label="Generate Pilot Link"
                className="btn btn-accent btn-lg whitespace-nowrap"
              >
                <ArrowPathIcon className="h-4 w-4" />
              </GeneratePilotLinkButton>
            </div>
            <div className="divider divider-horizontal hidden lg:flex" />
          </>
        )}
        <div className="flex-shrink-0">
          <RunPilotButton runUrl={jatosRunUrl} />
        </div>
        <div className="divider divider-horizontal hidden lg:flex" />
        <div className="flex-shrink-0">
          <AsyncButton
            onClick={onCheckStatus}
            loadingText="Checking..."
            disabled={!jatosStudyUUID}
            className="btn btn-secondary btn-lg whitespace-nowrap"
          >
            Check Pilot Status
          </AsyncButton>
        </div>
      </div>
    </div>
  )
}
