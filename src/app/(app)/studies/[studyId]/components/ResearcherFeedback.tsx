import { getStudyDataByCommentRsc } from "../../queries/getStudyDataByComment"
import { getFeedbackTemplateRsc } from "../setup/step4/queries/getFeedbackTemplate"
import FeedbackCard from "./client/FeedbackCard"

interface ResearcherFeedbackProps {
  studyId: number
}

export default async function ResearcherFeedback({ studyId }: ResearcherFeedbackProps) {
  try {
    // Get test results for preview
    const { enrichedResult } = await getStudyDataByCommentRsc(studyId, "test")

    // Get feedback template
    const template = await getFeedbackTemplateRsc(studyId)

    if (!template) {
      return null
    }

    return (
      <FeedbackCard
        studyId={studyId}
        enrichedResult={enrichedResult}
        template={template}
        title="Feedback Preview (Test Results)"
      />
    )
  } catch (error) {
    console.error("Error loading researcher feedback preview:", error)
    return null
  }
}
