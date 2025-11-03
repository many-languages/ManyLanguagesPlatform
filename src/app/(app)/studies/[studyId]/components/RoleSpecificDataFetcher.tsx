import { getStudyParticipantRsc } from "../../queries/getStudyParticipant"
import RunStudyButton from "../setup/step3/components/client/RunStudyButton"
import { Alert } from "@/src/app/components/Alert"

interface ParticipantDataProps {
  studyId: number
  setupComplete: boolean
}

export default async function ParticipantData({ studyId, setupComplete }: ParticipantDataProps) {
  const participant = await getStudyParticipantRsc(studyId).catch(() => null)

  if (!setupComplete) {
    return (
      <Alert variant="warning" className="mt-4">
        <p>This study is not currently accepting participants.</p>
      </Alert>
    )
  }

  if (!participant) {
    return <button className="btn btn-disabled loading">Loading study...</button>
  }

  return <RunStudyButton runUrl={participant.jatosRunUrl} isActive={participant.active} />
}
