import { getResultsMetadata } from "@/src/lib/jatos/api/getResultsMetadata"
import { getStudyProperties } from "@/src/lib/jatos/api/getStudyProperties"
import { getStudyParticipantsRsc } from "../../queries/getStudyParticipants"
import StudySummary from "./client/StudySummary"
import ParticipantManagementCard from "./client/ParticipantManagementCard"
import ResultsCard from "./client/ResultsCard"
import JatosInformationCard from "./client/JatosInformationCard"
import { Alert } from "@/src/app/components/Alert"
import { isSetupComplete } from "../setup/utils/setupStatus"
import { StudyWithRelations } from "../../queries/getStudy"

interface ResearcherDataProps {
  studyId: number
  study: StudyWithRelations
}

export default async function ResearcherData({ studyId, study }: ResearcherDataProps) {
  const setupComplete = isSetupComplete(study)

  // If JATOS study not imported, show setup alert
  if (!study.jatosStudyId || !study.jatosStudyUUID) {
    return (
      <Alert variant="info" className="mt-4">
        <p>Complete Step 2 of setup to import your JATOS study.</p>
      </Alert>
    )
  }

  // If setup not complete, don't show JATOS data
  if (!setupComplete) {
    return null
  }

  // Fetch all JATOS-related data in parallel
  const [participants, metadata, properties] = await Promise.all([
    getStudyParticipantsRsc(studyId).catch(() => []),
    getResultsMetadata({ studyIds: [study.jatosStudyId] }),
    getStudyProperties(study.jatosStudyUUID),
  ])

  return (
    <>
      {/* Summary statistics of the study */}
      {metadata && <StudySummary metadata={metadata} />}

      {/* Manage participants for the study */}
      <ParticipantManagementCard participants={participants} metadata={metadata} />

      {/* Showing detailed results */}
      <ResultsCard jatosStudyId={study.jatosStudyId} metadata={metadata} properties={properties} />

      {/* Information about the study fetched from JATOS */}
      <JatosInformationCard properties={properties} />
    </>
  )
}
