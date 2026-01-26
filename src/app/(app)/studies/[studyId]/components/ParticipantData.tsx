import { getStudyParticipantRsc } from "../../queries/getStudyParticipant"
import { Alert } from "@/src/app/components/Alert"
import { isSetupComplete } from "../setup/utils/setupStatus"
import { StudyWithRelations } from "../../queries/getStudy"
import ParticipantFeedbackData from "../feedback/components/ParticipantFeedbackData"
import { checkParticipantCompletionAction } from "../feedback/actions/checkParticipantCompletion"
import { CheckCircleIcon } from "@heroicons/react/24/solid"
import StudyInformationCard from "./client/StudyInformationCard"
import RunPilotButton from "../setup/step3/components/client/RunPilotButton"

interface ParticipantDataProps {
  studyId: number
  study: StudyWithRelations
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
        <Alert variant="error" className="mt-4">
          <p>Unable to load participant information. Please try refreshing the page.</p>
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

    // Build actions for participant
    const participantActions = shouldShowButton ? (
      <div className="flex justify-center">
        <RunPilotButton runUrl={participant.jatosRunUrl} isActive={participant.active} />
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

        {/* Completion message for SINGLE run studies */}
        {isCompleted && isSingleRunStudy && (
          <div className="flex flex-col items-center justify-center mt-4 p-6 rounded-lg bg-success/10 border border-success/20">
            <CheckCircleIcon className="h-12 w-12 text-success mb-3" />
            <h3 className="text-lg font-semibold text-success mb-1">Study Completed</h3>
            <p className="text-sm text-base-content/70">Thank you for your participation!</p>
          </div>
        )}

        <ParticipantFeedbackData
          studyId={studyId}
          pseudonym={participant.pseudonym}
          jatosStudyId={jatosStudyId!}
        />
      </>
    )
  } catch (error: any) {
    console.error("Error fetching participant data:", error)
    return (
      <Alert variant="error" className="mt-4">
        <p>Failed to load participant information. Please try again later.</p>
        {error instanceof Error && error.message && (
          <p className="text-sm mt-2 opacity-75">{error.message}</p>
        )}
      </Alert>
    )
  }
}
