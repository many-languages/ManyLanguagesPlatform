import { getStudyDataByCommentRsc } from "../../../queries/getStudyDataByComment"
import { getFeedbackTemplateRsc } from "../queries/getFeedbackTemplate"
import ResearcherFeedback from "./client/ResearcherFeedback"
import { getAllTestResultsRsc } from "@/src/app/(app)/studies/[studyId]/utils/getAllTestResults"

interface ResearcherFeedbackDataProps {
  studyId: number
}

export default async function ResearcherFeedbackData({ studyId }: ResearcherFeedbackDataProps) {
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
      <ResearcherFeedback
        studyId={studyId}
        initialEnrichedResult={enrichedResult}
        template={template}
        initialAllEnrichedResults={allTestResults}
      />
    )
  } catch (error) {
    console.error("Error loading researcher feedback preview:", error)
    return null
  }
}
