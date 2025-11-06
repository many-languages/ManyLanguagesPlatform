import { getStudyDataByCommentRsc } from "../../queries/getStudyDataByComment"
import { getFeedbackTemplateRsc } from "../setup/step4/queries/getFeedbackTemplate"
import FeedbackCard from "./client/FeedbackCard"
import { getAllTestResultsRsc } from "@/src/app/(app)/studies/[studyId]/utils/getAllTestResults"

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

    // Get all test results for "across" scope statistics
    const allTestResults = await getAllTestResultsRsc(studyId)

    return (
      <FeedbackCard
        studyId={studyId}
        enrichedResult={enrichedResult}
        template={template}
        title="Feedback Preview (Test Results)"
        allEnrichedResults={allTestResults}
      />
    )
  } catch (error) {
    console.error("Error loading researcher feedback preview:", error)
    return null
  }
}
