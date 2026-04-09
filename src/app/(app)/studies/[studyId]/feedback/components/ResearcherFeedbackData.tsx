import { Alert } from "@/src/app/components/Alert"
import ResearcherFeedback from "./client/ResearcherFeedback"
import { loadResearcherFeedbackViewModel } from "../utils/loadResearcherFeedback"
import {
  RESEARCHER_FEEDBACK_RSC_NO_TEMPLATE,
  RESEARCHER_FEEDBACK_RSC_NOT_AUTHORIZED,
  RESEARCHER_FEEDBACK_RSC_SIGN_IN,
  researcherFeedbackPersonalDataBlockedMessage,
} from "../utils/researcherFeedbackRscMessages"

interface ResearcherFeedbackDataProps {
  studyId: number
  /** When false, hide “Edit” (Step 6) on the feedback preview card. */
  canEditStudySetup?: boolean
}

export default async function ResearcherFeedbackData({
  studyId,
  canEditStudySetup = true,
}: ResearcherFeedbackDataProps) {
  const step = await loadResearcherFeedbackViewModel(studyId)

  if (step.kind === "not_authenticated") {
    return (
      <Alert variant="warning" className="mt-4" title="Sign in required">
        <p>{RESEARCHER_FEEDBACK_RSC_SIGN_IN}</p>
      </Alert>
    )
  }

  if (step.kind === "not_authorized") {
    return (
      <Alert variant="error" className="mt-4" title="Feedback unavailable">
        <p>{RESEARCHER_FEEDBACK_RSC_NOT_AUTHORIZED}</p>
      </Alert>
    )
  }

  if (step.kind === "no_template") {
    return (
      <ResearcherFeedback
        studyId={studyId}
        renderedMarkdown={null}
        researcherHasPilotData={true}
        feedbackMessage={RESEARCHER_FEEDBACK_RSC_NO_TEMPLATE}
        feedbackTone="info"
        canEditStudySetup={canEditStudySetup}
      />
    )
  }

  const loaded = step.loaded

  if (loaded.kind === "failed") {
    return (
      <ResearcherFeedback
        studyId={studyId}
        renderedMarkdown={null}
        researcherHasPilotData={true}
        feedbackMessage={loaded.error}
        feedbackTone="error"
        canEditStudySetup={canEditStudySetup}
      />
    )
  }

  if (loaded.kind === "personal_data_blocked") {
    return (
      <ResearcherFeedback
        studyId={studyId}
        renderedMarkdown={null}
        researcherHasPilotData={true}
        feedbackMessage={researcherFeedbackPersonalDataBlockedMessage(loaded.variableNames)}
        feedbackTone="warning"
        canEditStudySetup={canEditStudySetup}
      />
    )
  }

  return (
    <ResearcherFeedback
      studyId={studyId}
      renderedMarkdown={loaded.renderedMarkdown}
      researcherHasPilotData={loaded.researcherHasPilotData}
      canEditStudySetup={canEditStudySetup}
    />
  )
}
