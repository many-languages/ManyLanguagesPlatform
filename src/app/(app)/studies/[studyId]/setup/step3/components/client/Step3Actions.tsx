"use client"

import { ArrowPathIcon } from "@heroicons/react/24/outline"
import { Alert } from "@/src/app/components/Alert"
import { AsyncButton } from "@/src/app/components/AsyncButton"
import RunStudyButton from "./RunStudyButton"
import GenerateTestLinkButton from "./GenerateTestLinkButton"

interface Step3ActionsProps {
  pilotCompleted: boolean | null
  jatosRunUrl: string | null
  researcherId: number // Required - Step3Content returns early if null
  jatosStudyId: number | null
  jatosBatchId: number | null
  jatosStudyUUID: string | null
  onCheckStatus: () => Promise<void>
}

export default function Step3Actions({
  pilotCompleted,
  jatosRunUrl,
  researcherId,
  jatosStudyId,
  jatosBatchId,
  jatosStudyUUID,
  onCheckStatus,
}: Step3ActionsProps) {
  if (!jatosStudyId || !jatosBatchId) {
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
        {/* Generate Test Link button when no link exists */}
        <div className="flex justify-center">
          <GenerateTestLinkButton
            studyResearcherId={researcherId}
            jatosStudyId={jatosStudyId}
            jatosBatchId={jatosBatchId}
            label="Generate Test Link"
            className="btn btn-primary btn-lg"
          />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Actions Section - Generate Test Link (if completed), Run Study and Check Status */}
      <div className="flex justify-center items-center gap-0">
        {pilotCompleted === true && jatosStudyId && jatosBatchId && (
          <>
            <GenerateTestLinkButton
              studyResearcherId={researcherId}
              jatosStudyId={jatosStudyId}
              jatosBatchId={jatosBatchId}
              label="Generate Test Link"
              className="btn btn-accent btn-lg"
            >
              <ArrowPathIcon className="h-4 w-4" />
            </GenerateTestLinkButton>
            <div className="divider divider-horizontal"></div>
          </>
        )}
        <RunStudyButton runUrl={jatosRunUrl} />
        <div className="divider divider-horizontal"></div>
        <AsyncButton
          onClick={onCheckStatus}
          loadingText="Checking..."
          disabled={!jatosStudyUUID}
          className="btn btn-secondary btn-lg"
        >
          Check Pilot Status
        </AsyncButton>
      </div>
    </div>
  )
}
