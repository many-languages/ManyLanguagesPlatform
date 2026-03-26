import { Alert } from "@/src/app/components/Alert"
import ParticipantFeedback from "./client/ParticipantFeedback"
import { loadParticipantFeedbackViewModel } from "../utils/loadParticipantFeedback"
import {
  PARTICIPANT_FEEDBACK_RSC_NOT_ENROLLED,
  PARTICIPANT_FEEDBACK_RSC_NO_TEMPLATE,
  PARTICIPANT_FEEDBACK_RSC_SIGN_IN,
} from "../utils/participantFeedbackRscMessages"

interface ParticipantFeedbackDataProps {
  studyId: number
  pseudonym: string
  jatosStudyId: number
}

export default async function ParticipantFeedbackData({
  studyId,
  pseudonym,
  jatosStudyId,
}: ParticipantFeedbackDataProps) {
  const step = await loadParticipantFeedbackViewModel(studyId, pseudonym, jatosStudyId)

  if (step.kind === "not_authenticated") {
    return (
      <Alert variant="warning" className="mt-4" title="Sign in required">
        <p>{PARTICIPANT_FEEDBACK_RSC_SIGN_IN}</p>
      </Alert>
    )
  }

  if (step.kind === "not_enrolled") {
    return (
      <Alert variant="error" className="mt-4" title="Feedback unavailable">
        <p>{PARTICIPANT_FEEDBACK_RSC_NOT_ENROLLED}</p>
      </Alert>
    )
  }

  if (step.kind === "no_template") {
    return (
      <Alert variant="info" className="mt-4" title="Feedback unavailable">
        <p>{PARTICIPANT_FEEDBACK_RSC_NO_TEMPLATE}</p>
      </Alert>
    )
  }

  const loaded = step.loaded

  if (loaded.kind === "failed") {
    return (
      <Alert variant="error" className="mt-4" title="Feedback unavailable">
        <p>{loaded.error}</p>
      </Alert>
    )
  }

  const initialCompleted = loaded.kind === "loaded"
  const initialRenderedMarkdown = loaded.kind === "loaded" ? loaded.renderedMarkdown : null

  return (
    <ParticipantFeedback
      studyId={studyId}
      pseudonym={pseudonym}
      jatosStudyId={jatosStudyId}
      initialCompleted={initialCompleted}
      initialRenderedMarkdown={initialRenderedMarkdown}
    />
  )
}
