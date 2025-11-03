"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "react-hot-toast"
import GenerateTestLinkButton from "./GenerateTestLinkButton"
import RunStudyButton from "./RunStudyButton"
import { checkPilotCompletionFromMetadata } from "@/src/lib/jatos/api/checkPilotCompletion"
import { callJatosApi } from "@/src/lib/jatos/api/client"
import type { GetResultsMetadataResponse } from "@/src/types/jatos-api"
import { Alert } from "@/src/app/components/Alert"
import { AsyncButton } from "@/src/app/components/AsyncButton"
import { StudyWithRelations } from "../../../../../queries/getStudy"
import StepNavigation from "../../../components/StepNavigation"

interface Step3ContentProps {
  study: StudyWithRelations
  studyId: number
  researcherId: number | null
  jatosRunUrl: string | null
}
export default function Step3Content({
  study,
  studyId,
  researcherId,
  jatosRunUrl,
}: Step3ContentProps) {
  const router = useRouter()

  // Pilot completion state
  const [pilotCompleted, setPilotCompleted] = useState<boolean | null>(null)

  const handleGenerated = () => {
    window.location.reload() // refresh to pick up new runUrl
  }

  const checkPilotStatus = async () => {
    if (!study?.jatosStudyUUID) return

    try {
      // Fetch metadata using typed API client
      const metadata = await callJatosApi<GetResultsMetadataResponse>("/get-results-metadata", {
        method: "POST",
        body: { studyUuids: [study.jatosStudyUUID] },
      })

      const completed = checkPilotCompletionFromMetadata(metadata, study.jatosStudyUUID)
      setPilotCompleted(completed)

      if (completed) {
        toast.success("Pilot study completed! You can proceed to Step 4.")
      } else {
        toast.error("No completed pilot study found. Please complete the survey and try again.")
      }
    } catch (error) {
      console.error("Failed to check pilot status:", error)
      setPilotCompleted(false)
      toast.error("Failed to check pilot status")
    }
  }

  if (!researcherId) {
    return <p className="text-error">You are not assigned as a researcher to this study.</p>
  }

  return (
    <>
      {/* Save & Exit button */}
      <div className="mb-4">
        <button className="btn btn-ghost" onClick={() => router.push(`/studies/${studyId}`)}>
          ← Save & Exit Setup
        </button>
      </div>

      {!jatosRunUrl ? (
        <>
          <GenerateTestLinkButton
            studyResearcherId={researcherId}
            jatosStudyId={study.jatosStudyId!}
            jatosBatchId={study.jatosBatchId!}
            onGenerated={handleGenerated}
          />
        </>
      ) : (
        <>
          <p className="mb-2 text-sm opacity-70">
            Use the button below to run your imported study in JATOS.
          </p>
          <RunStudyButton runUrl={jatosRunUrl} />

          {/* Check pilot status button */}
          <div className="mt-4">
            <AsyncButton
              onClick={checkPilotStatus}
              loadingText="Checking..."
              className="btn btn-sm btn-outline"
            >
              Check Pilot Status
            </AsyncButton>
          </div>

          {/* Status messages */}
          {pilotCompleted === false && (
            <Alert variant="warning" className="mt-4">
              <p>Please complete the pilot study before proceeding to Step 4.</p>
              <p className="text-sm">
                1. Click "Run Study" above to open the survey
                <br />
                2. Complete the entire survey
                <br />
                3. Click "Check Pilot Status" to verify completion
              </p>
            </Alert>
          )}

          {pilotCompleted === true && (
            <Alert variant="success" className="mt-4">
              <p>✓ Pilot study completed! You can proceed to Step 4.</p>
            </Alert>
          )}

          {pilotCompleted === null && jatosRunUrl && (
            <Alert variant="info" className="mt-4">
              <p>After completing the pilot study, click "Check Pilot Status" to verify.</p>
            </Alert>
          )}
        </>
      )}
      <StepNavigation prev="step2" next="step4" disableNext={!jatosRunUrl || !pilotCompleted} />
    </>
  )
}
