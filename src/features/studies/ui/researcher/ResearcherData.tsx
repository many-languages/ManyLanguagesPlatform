import StudySummary from "./StudySummary"
import ParticipantManagementCard from "./ParticipantManagementCard"
import ResultsCardWrapper from "./ResultsCardWrapper"
import { Alert } from "@/src/components/ui/Alert"
import { isSetupComplete } from "../../domain/setup/setupStatus"
import { studySetupStepPath } from "../../domain/setup/setupRoutes"
import type { StudyWithRelations } from "../../types"
import { ResearcherFeedbackData } from "@/src/features/feedback"
import StudyInformationCard from "../shared/StudyInformationCard"
import { NavigationButton } from "@/src/components/ui/NavigationButton"
import StudyLifecycleActions from "../shared/StudyLifecycleActions"
import { ARCHIVED_STUDY_CANNOT_EDIT_MESSAGE } from "../../domain/studyEditability"
import { loadResearcherStudyData } from "../../server/loadResearcherStudyData"

interface ResearcherDataProps {
  studyId: number
  study: StudyWithRelations
  /** When false, "Edit" (setup) is disabled — e.g. archived study. */
  canEditStudySetup?: boolean
}

export default async function ResearcherData({
  studyId,
  study,
  canEditStudySetup = true,
}: ResearcherDataProps) {
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

  const loaded = await loadResearcherStudyData({ studyId, study, jatosStudyId })

  if (loaded.kind === "not_authenticated") {
    return (
      <Alert variant="error" className="mt-4">
        <p>You must be logged in to view this study.</p>
      </Alert>
    )
  }

  if (loaded.kind === "study_properties_failed") {
    return (
      <Alert variant="error" className="mt-4">
        <p>Failed to load study properties. Please try refreshing the page.</p>
      </Alert>
    )
  }

  if (loaded.kind === "unexpected_error") {
    return (
      <Alert variant="error" className="mt-4">
        <p>An unexpected error occurred while loading study data. Please try again later.</p>
      </Alert>
    )
  }

  // Build actions for researcher
  const researcherActions = (
    <div className="flex flex-wrap justify-end gap-2 items-start">
      <span
        className={!canEditStudySetup ? "tooltip tooltip-top inline-block" : "inline-block"}
        data-tip={!canEditStudySetup ? ARCHIVED_STUDY_CANNOT_EDIT_MESSAGE : undefined}
      >
        <NavigationButton
          href={studySetupStepPath(study.id, 1, { edit: true, returnTo: "study" })}
          className={`btn-primary ${!canEditStudySetup ? "btn-disabled" : ""}`}
          pendingText="Opening"
          disabled={!canEditStudySetup}
        >
          Edit
        </NavigationButton>
      </span>
      <StudyLifecycleActions
        studyId={study.id}
        isArchived={study.archived}
        hasParticipantResponses={loaded.lifecycleHasResponses}
        showLifecycleActions={loaded.isPi}
      />
    </div>
  )

  return (
    <>
      {/* Study information */}
      <StudyInformationCard study={study} userRole="RESEARCHER" actions={researcherActions} />

      {/* Summary statistics of the study */}
      {loaded.metadata && <StudySummary metadata={loaded.metadata} />}

      {/* Manage participants for the study */}
      {loaded.metadata && (
        <ParticipantManagementCard
          participants={loaded.participants}
          metadata={loaded.metadata}
          canEditStudySetup={canEditStudySetup}
        />
      )}

      {/* Showing detailed results */}
      {loaded.metadata && (
        <ResultsCardWrapper
          jatosStudyId={jatosStudyId}
          metadata={loaded.metadata}
          properties={loaded.properties}
          studyId={studyId}
          initialEnrichedResults={loaded.enrichedResults}
          hasApprovedExtraction={Boolean(latestUpload?.approvedExtractionId)}
        />
      )}

      {/* Feedback preview with pilot results */}
      <ResearcherFeedbackData studyId={studyId} canEditStudySetup={canEditStudySetup} />
    </>
  )
}
