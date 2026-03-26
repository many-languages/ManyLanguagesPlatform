import { Alert } from "@/src/app/components/Alert"
import ResearcherFeedback from "./client/ResearcherFeedback"
import { loadResearcherFeedbackViewModel } from "../utils/loadResearcherFeedback"
import {
  RESEARCHER_FEEDBACK_RSC_NO_TEMPLATE,
  RESEARCHER_FEEDBACK_RSC_NOT_AUTHORIZED,
  RESEARCHER_FEEDBACK_RSC_SIGN_IN,
} from "../utils/researcherFeedbackRscMessages"

interface ResearcherFeedbackDataProps {
  studyId: number
}

export default async function ResearcherFeedbackData({ studyId }: ResearcherFeedbackDataProps) {
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
      <Alert variant="info" className="mt-4" title="No feedback template">
        <p>{RESEARCHER_FEEDBACK_RSC_NO_TEMPLATE}</p>
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

  return (
    <ResearcherFeedback
      studyId={studyId}
      renderedMarkdown={loaded.renderedMarkdown}
      researcherHasPilotData={loaded.researcherHasPilotData}
    />
  )
}
