import { Alert } from "@/src/components/ui/Alert"
import { isSetupComplete } from "../../domain/setup/setupStatus"
import type { ParticipantStudyOverview } from "../../types"
import { ParticipantFeedbackData, checkParticipantCompletionAction } from "@/src/features/feedback"
import { CheckCircleIcon } from "@heroicons/react/24/solid"
import StudyInformationCard from "../shared/StudyInformationCard"
import RunStudyButton from "../shared/RunStudyButton"
import { getStudyParticipantRsc } from "../../server/getStudyParticipant"

interface ParticipantDataProps {
  studyId: number
  study: ParticipantStudyOverview
}

export default async function ParticipantData({ studyId, study }: ParticipantDataProps) {
  const setupComplete = isSetupComplete(study)
  const latestUpload = study.latestJatosStudyUpload
  const jatosStudyId = latestUpload?.jatosStudyId ?? null
  const jatosWorkerType = latestUpload?.jatosWorkerType ?? null

  if (!setupComplete) {
    return (
      <Alert variant="warning" className="mt-4">
        <p>This study is not currently accepting participants.</p>
      </Alert>
    )
  }

  try {
    const participant = await getStudyParticipantRsc(studyId)

    if (!participant) {
      return (
        <Alert variant="info" className="mt-4">
          <p>You have not joined this study yet.</p>
        </Alert>
      )
    }

    // Check if participant has completed the study
    const completionCheck = await checkParticipantCompletionAction(
      studyId,
      participant.pseudonym,
      jatosStudyId!
    )

    const isCompleted = completionCheck.success && completionCheck.completed
    const isSingleRunStudy = jatosWorkerType === "SINGLE"

    // Hide button if study is completed and it's a SINGLE run study
    const shouldShowButton = !(isCompleted && isSingleRunStudy)

    // Disable run button when study is paused (participants who haven't run yet cannot start)
    const canRunStudy = participant.active && study.status === "OPEN"

    // Build actions for participant
    const participantActions = shouldShowButton ? (
      <div className="flex justify-center">
        <RunStudyButton runUrl={participant.jatosRunUrl} isActive={canRunStudy} label="Run study" />
      </div>
    ) : undefined

    return (
      <>
        {/* Study information */}
        <StudyInformationCard
          study={study}
          userRole="PARTICIPANT"
          isPayed={participant.payed}
          actions={participantActions}
        />

        {/* Completion message once at least one run exists (copy differs for reusable personal links) */}
        {isCompleted && (isSingleRunStudy || jatosWorkerType === "MULTIPLE") && (
          <div className="flex flex-col items-center justify-center mt-4 p-6 rounded-lg bg-success/10 border border-success/20">
            <CheckCircleIcon className="h-12 w-12 text-success mb-3" />
            <h3 className="text-lg font-semibold text-success mb-1">Study Completed</h3>
            <p className="text-sm text-base-content/70 text-center max-w-md">
              {jatosWorkerType === "MULTIPLE"
                ? "You can complete this study again; your latest run is recorded."
                : "Thank you for your participation!"}
            </p>
          </div>
        )}

        <ParticipantFeedbackData
          studyId={studyId}
          pseudonym={participant.pseudonym}
          jatosStudyId={jatosStudyId!}
        />
      </>
    )
  } catch (error: unknown) {
    console.error("Error fetching participant data:", error)

    const err = error instanceof Error ? error : null
    const showDevDetail = process.env.NODE_ENV === "development" && Boolean(err?.message.trim())

    return (
      <Alert variant="error" className="mt-4">
        <p>Failed to load participant information. Please try again later.</p>
        {showDevDetail && err ? (
          <p className="mt-2 break-all font-mono text-sm opacity-75">{err.message}</p>
        ) : null}
      </Alert>
    )
  }
}
