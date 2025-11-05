import { getStudyParticipantRsc } from "../../queries/getStudyParticipant"
import RunStudyButton from "../setup/step3/components/client/RunStudyButton"
import { Alert } from "@/src/app/components/Alert"
import { isSetupComplete } from "../setup/utils/setupStatus"
import { StudyWithRelations } from "../../queries/getStudy"

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

  const participant = await getStudyParticipantRsc(studyId).catch(() => null)

  if (!participant) {
    return <button className="btn btn-disabled loading">Loading study...</button>
  }

  return <RunStudyButton runUrl={participant.jatosRunUrl} isActive={participant.active} />
}
