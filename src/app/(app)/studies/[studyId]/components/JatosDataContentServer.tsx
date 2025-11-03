import { getResultsMetadata } from "@/src/lib/jatos/api/getResultsMetadata"
import { getStudyProperties } from "@/src/lib/jatos/api/getStudyProperties"
import StudySummary from "./client/StudySummary"
import ParticipantManagementCard from "./client/ParticipantManagementCard"
import ResultsCard from "./client/ResultsCard"
import JatosInformationCard from "./client/JatosInformationCard"
import { ParticipantWithEmail } from "../../../queries/getStudyParticipants"

interface JatosDataContentServerProps {
  jatosStudyId: number
  jatosStudyUUID: string
  participants: ParticipantWithEmail[]
}

export default async function JatosDataContentServer({
  jatosStudyId,
  jatosStudyUUID,
  participants,
}: JatosDataContentServerProps) {
  const [metadata, properties] = await Promise.all([
    getResultsMetadata({ studyIds: [jatosStudyId] }),
    getStudyProperties(jatosStudyUUID),
  ])

  return (
    <>
      {/* Summary statistics of the study */}
      {metadata && <StudySummary metadata={metadata} />}

      {/* Manage participants for the study */}
      <ParticipantManagementCard participants={participants} metadata={metadata} />

      {/* Showing detailed results */}
      <ResultsCard jatosStudyId={jatosStudyId} metadata={metadata} properties={properties} />

      {/* Information about the study fetched from JATOS */}
      <JatosInformationCard properties={properties} />
    </>
  )
}
