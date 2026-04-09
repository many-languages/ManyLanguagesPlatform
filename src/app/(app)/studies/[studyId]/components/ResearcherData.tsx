import { getBlitzContext } from "@/src/app/blitz-server"
import {
  getResultsMetadataForResearcher,
  getStudyPropertiesForResearcher,
  getEnrichedResultsForResearcher,
} from "@/src/lib/jatos/jatosAccessService"
import { getStudyParticipantsRsc } from "../../queries/getStudyParticipants"
import StudySummary from "./client/StudySummary"
import ParticipantManagementCard from "./client/ParticipantManagementCard"
import ResultsCardWrapper from "./ResultsCardWrapper"
import { Alert } from "@/src/app/components/Alert"
import { isSetupComplete } from "../setup/utils/setupStatus"
import { studySetupStepPath } from "../setup/utils/setupRoutes"
import { StudyWithRelations } from "../../queries/getStudy"
import ResearcherFeedbackData from "../feedback/components/ResearcherFeedbackData"
import StudyInformationCard from "./client/StudyInformationCard"
import { NavigationButton } from "@/src/app/components/NavigationButton"
import StudyLifecycleActions from "@/src/app/components/studies/StudyLifecycleActions"
import { hasParticipantResponses as hasParticipantResponsesInResults } from "@/src/lib/jatos/utils/studyHasParticipantResponses"

interface ResearcherDataProps {
  studyId: number
  study: StudyWithRelations
}

export default async function ResearcherData({ studyId, study }: ResearcherDataProps) {
  const setupComplete = isSetupComplete(study)
  const latestUpload = study.latestJatosStudyUpload
  const jatosStudyId = latestUpload?.jatosStudyId ?? null

  // If JATOS study not imported, show setup alert
  if (!jatosStudyId || !study.jatosStudyUUID) {
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

  const { session } = await getBlitzContext()
  const userId = session.userId
  if (userId == null) {
    return (
      <Alert variant="error" className="mt-4">
        <p>You must be logged in to view this study.</p>
      </Alert>
    )
  }

  // Fetch all JATOS-related data in parallel with explicit error handling
  let participants: Awaited<ReturnType<typeof getStudyParticipantsRsc>> = []
  let metadata: Awaited<ReturnType<typeof getResultsMetadataForResearcher>> | null = null
  let properties: Awaited<ReturnType<typeof getStudyPropertiesForResearcher>> | null = null
  let enrichedResults: Awaited<ReturnType<typeof getEnrichedResultsForResearcher>> = []

  try {
    const [pRes, mRes, propRes, enrichedRes] = await Promise.allSettled([
      getStudyParticipantsRsc(studyId),
      getResultsMetadataForResearcher({
        studyId,
        userId,
        studyIds: [jatosStudyId],
      }),
      getStudyPropertiesForResearcher({
        studyId,
        userId,
        jatosStudyUUID: study.jatosStudyUUID ?? undefined,
      }),
      getEnrichedResultsForResearcher({ studyId, userId, jatosStudyId }),
    ])
    participants = pRes.status === "fulfilled" ? pRes.value : []
    metadata = mRes.status === "fulfilled" ? mRes.value : null
    properties = propRes.status === "fulfilled" ? propRes.value : null
    enrichedResults = enrichedRes.status === "fulfilled" ? enrichedRes.value : []

    // Handle participants - already extracted above
    if (participants.length === 0 && metadata === null) {
      console.error("Failed to fetch participants")
    }

    // Handle metadata - already extracted above
    if (metadata === null) {
      console.error("Failed to fetch results metadata")
      // Continue without metadata - will show empty summary
    }

    // Handle properties result - this is critical, so we need it
    if (properties === null) {
      console.error("Failed to fetch study properties")
      // Return error alert if properties fail
      return (
        <Alert variant="error" className="mt-4">
          <p>Failed to load study properties. Please try refreshing the page.</p>
        </Alert>
      )
    }
  } catch (error: unknown) {
    console.error("Unexpected error fetching JATOS data:", error)
    return (
      <Alert variant="error" className="mt-4">
        <p>An unexpected error occurred while loading study data. Please try again later.</p>
      </Alert>
    )
  }

  const jatosUuid = study.jatosStudyUUID?.trim()
  let lifecycleHasResponses: boolean | null = null
  if (metadata) {
    const entry =
      metadata.data?.find((d) => d.studyUuid === jatosUuid) ?? metadata.data?.[0] ?? null
    lifecycleHasResponses = entry
      ? hasParticipantResponsesInResults(entry.studyResults ?? [])
      : false
  }

  const isPi = study.researchers.some((r) => r.userId === userId && r.role === "PI")

  // Build actions for researcher
  const researcherActions = (
    <div className="flex flex-wrap justify-end gap-2 items-start">
      <NavigationButton
        href={studySetupStepPath(study.id, 1, { edit: true, returnTo: "study" })}
        className="btn-primary"
        pendingText="Opening"
      >
        Edit
      </NavigationButton>
      <StudyLifecycleActions
        studyId={study.id}
        isArchived={study.archived}
        hasParticipantResponses={lifecycleHasResponses}
        showLifecycleActions={isPi}
      />
    </div>
  )

  return (
    <>
      {/* Study information */}
      <StudyInformationCard study={study} userRole="RESEARCHER" actions={researcherActions} />

      {/* Summary statistics of the study */}
      {metadata && <StudySummary metadata={metadata} />}

      {/* Manage participants for the study */}
      {metadata && <ParticipantManagementCard participants={participants} metadata={metadata} />}

      {/* Showing detailed results */}
      {metadata && (
        <ResultsCardWrapper
          jatosStudyId={jatosStudyId}
          metadata={metadata}
          properties={properties}
          studyId={studyId}
          initialEnrichedResults={enrichedResults}
        />
      )}

      {/* Feedback preview with pilot results */}
      <ResearcherFeedbackData studyId={studyId} />
    </>
  )
}
