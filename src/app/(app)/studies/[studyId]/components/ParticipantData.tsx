import { getStudyParticipantRsc } from "../../queries/getStudyParticipant"
import RunStudyButton from "../setup/step3/components/client/RunStudyButton"
import { Alert } from "@/src/app/components/Alert"
import { LoadingMessage } from "@/src/app/components/LoadingStates"
import { isSetupComplete } from "../setup/utils/setupStatus"
import { StudyWithRelations } from "../../queries/getStudy"
import ParticipantFeedback from "./ParticipantFeedback"

interface ParticipantDataProps {
  studyId: number
  study: StudyWithRelations
}

export default async function ParticipantData({ studyId, study }: ParticipantDataProps) {
  const setupComplete = isSetupComplete(study)

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

    return (
      <>
        <RunStudyButton runUrl={participant.jatosRunUrl} isActive={participant.active} />
        <ParticipantFeedback studyId={studyId} />
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
