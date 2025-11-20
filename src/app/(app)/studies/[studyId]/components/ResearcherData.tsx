import { getResultsMetadata } from "@/src/lib/jatos/api/getResultsMetadata"
import { getStudyProperties } from "@/src/lib/jatos/api/getStudyProperties"
import { getStudyParticipantsRsc } from "../../queries/getStudyParticipants"
import StudySummary from "./client/StudySummary"
import ParticipantManagementCard from "./client/ParticipantManagementCard"
import ResultsCardWrapper from "./ResultsCardWrapper"
import { Alert } from "@/src/app/components/Alert"
import { isSetupComplete } from "../setup/utils/setupStatus"
import { StudyWithRelations } from "../../queries/getStudy"
import ResearcherFeedbackData from "../feedback/components/ResearcherFeedbackData"
import StudyInformationCard from "./client/StudyInformationCard"
import { NavigationButton } from "@/src/app/components/NavigationButton"
import ArchiveStudyButton from "../../components/client/ArchiveStudyButton"

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

  // Fetch all JATOS-related data in parallel with explicit error handling
  let participants: Awaited<ReturnType<typeof getStudyParticipantsRsc>> = []
  let metadata: Awaited<ReturnType<typeof getResultsMetadata>> | null = null
  let properties: Awaited<ReturnType<typeof getStudyProperties>> | null = null

  try {
    const results = await Promise.allSettled([
      getStudyParticipantsRsc(studyId),
      getResultsMetadata({ studyIds: [study.jatosStudyId] }),
      getStudyProperties(study.jatosStudyUUID),
    ])

    // Handle participants result
    if (results[0].status === "fulfilled") {
      participants = results[0].value
    } else {
      console.error("Failed to fetch participants:", results[0].reason)
      // Continue with empty array - participants are optional for display
    }

    // Handle metadata result
    if (results[1].status === "fulfilled") {
      metadata = results[1].value
    } else {
      console.error("Failed to fetch results metadata:", results[1].reason)
      // Continue without metadata - will show empty summary
    }

    // Handle properties result - this is critical, so we need it
    if (results[2].status === "fulfilled") {
      properties = results[2].value
    } else {
      console.error("Failed to fetch study properties:", results[2].reason)
      // Return error alert if properties fail
      return (
        <Alert variant="error" className="mt-4">
          <p>Failed to load study properties. Please try refreshing the page.</p>
        </Alert>
      )
    }
  } catch (error: any) {
    console.error("Unexpected error fetching JATOS data:", error)
    return (
      <Alert variant="error" className="mt-4">
        <p>An unexpected error occurred while loading study data. Please try again later.</p>
      </Alert>
    )
  }

  // Build actions for researcher
  const researcherActions = (
    <div className="flex flex-wrap justify-end gap-2">
      <NavigationButton
        href={`/studies/${study.id}/setup/step1?edit=true&returnTo=study`}
        className="btn-primary"
        pendingText="Opening"
      >
        Edit
      </NavigationButton>
      <ArchiveStudyButton studyId={study.id} isArchived={study.archived} />
    </div>
  )

  return (
    <>
      {/* Study information */}
      <StudyInformationCard study={study} userRole="RESEARCHER" actions={researcherActions} />

      {/* Summary statistics of the study */}
      {metadata && <StudySummary metadata={metadata} />}

      {/* Manage participants for the study */}
      <ParticipantManagementCard participants={participants} metadata={metadata} />

      {/* Showing detailed results */}
      <ResultsCardWrapper
        jatosStudyId={study.jatosStudyId}
        metadata={metadata}
        properties={properties}
        studyId={studyId}
      />

      {/* Feedback preview with test results */}
      <ResearcherFeedbackData studyId={studyId} />
    </>
  )
}
