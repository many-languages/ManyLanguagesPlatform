import { Alert } from "@/src/components/ui/Alert"
import { isSetupComplete } from "../../domain/setup/setupStatus"
import type { ParticipantStudyOverview } from "../../types"
import {
  ParticipantFeedbackData,
  checkParticipantCompletionAction,
} from "@/src/features/feedback/index.server"
import StudyInformationCard from "../shared/StudyInformationCard"
import RunStudyButton from "../shared/RunStudyButton"
import ParticipantRunAutoRefresh from "./ParticipantRunAutoRefresh"
import ParticipantRunStatusCard from "./ParticipantRunStatusCard"
import { getStudyParticipantRsc } from "../../server/getStudyParticipant"
import { getParticipantRunStarted } from "../../server/getParticipantRunStarted"

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

  if (jatosStudyId == null) {
    return (
      <Alert variant="error" className="mt-4">
        <p>Study setup is incomplete — JATOS linkage missing.</p>
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
      jatosStudyId
    )

    // Legacy studies have no contact email yet, so fall back to the PI's account email
    const contactEmail = study.contactEmail ?? study.researchers[0]?.user.email ?? null

    const isCompleted = completionCheck.success && completionCheck.completed
    const isSingleRunStudy = jatosWorkerType === "SINGLE"

    // A single-run link is used up once started. If it was started but never finished (for example
    // the run failed on the JATOS side), running it again would only show "can be run only once".
    const isRunInterrupted =
      isSingleRunStudy &&
      !isCompleted &&
      (await getParticipantRunStarted({
        studyId,
        pseudonym: participant.pseudonym,
        jatosStudyId,
      }))

    // Hide button if study is completed (or interrupted) and it's a SINGLE run study
    const shouldShowButton = !(isCompleted && isSingleRunStudy) && !isRunInterrupted

    // Disable run button when study is paused (participants who haven't run yet cannot start)
    const canRunStudy = participant.active && study.status === "OPEN"

    // Build actions for participant
    const participantActions = shouldShowButton ? (
      <div className="flex justify-center">
        <RunStudyButton
          runUrl={participant.jatosRunUrl}
          isActive={canRunStudy}
          label="Run study"
          contactEmail={contactEmail}
        />
      </div>
    ) : undefined

    return (
      <>
        {/* Pick up what happened in the JATOS window when the participant comes back */}
        <ParticipantRunAutoRefresh enabled={!isCompleted && !isRunInterrupted} />

        {/* Study information */}
        <StudyInformationCard
          study={study}
          userRole="PARTICIPANT"
          isPayed={participant.payed}
          contactEmail={contactEmail}
          actions={participantActions}
        />

        {isRunInterrupted && (
          <ParticipantRunStatusCard
            tone="warning"
            title="Study Not Completed"
            message={`Your session for this study was started but not completed, and this study can only be run once. Please contact the researcher${
              contactEmail ? ` at ${contactEmail}` : ""
            }.`}
          />
        )}

        {/* Completion message once at least one run exists (copy differs for reusable personal links) */}
        {isCompleted && (isSingleRunStudy || jatosWorkerType === "MULTIPLE") && (
          <ParticipantRunStatusCard
            tone="success"
            title="Study Completed"
            message={
              jatosWorkerType === "MULTIPLE"
                ? "You can complete this study again; your latest run is recorded."
                : "Thank you for your participation!"
            }
          />
        )}

        <ParticipantFeedbackData
          studyId={studyId}
          pseudonym={participant.pseudonym}
          jatosStudyId={jatosStudyId}
          sessionInterrupted={isRunInterrupted}
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
