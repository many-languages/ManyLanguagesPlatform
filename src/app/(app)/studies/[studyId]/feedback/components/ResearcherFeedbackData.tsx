import { getFeedbackTemplateRsc } from "../queries/getFeedbackTemplate"
import ResearcherFeedback from "./client/ResearcherFeedback"
import { getAllPilotResultsRsc } from "@/src/app/(app)/studies/[studyId]/utils/getAllPilotResults"
import { resolveRequiredVariableKeys } from "../utils/resolveRequiredVariableKeys"

interface ResearcherFeedbackDataProps {
  studyId: number
}

export default async function ResearcherFeedbackData({ studyId }: ResearcherFeedbackDataProps) {
  try {
    // Get pilot results for preview and across statistics
    const allPilotResults = await getAllPilotResultsRsc(studyId)
    const enrichedResult = allPilotResults[0] ?? null

    // Get feedback template
    const template = await getFeedbackTemplateRsc(studyId)

    if (!template) {
      return null
    }

    const requiredVariableKeyList = await resolveRequiredVariableKeys(template)

    return (
      <ResearcherFeedback
        studyId={studyId}
        initialEnrichedResult={enrichedResult}
        template={template}
        initialAllEnrichedResults={allPilotResults}
        requiredVariableKeyList={requiredVariableKeyList}
      />
    )
  } catch (error) {
    console.error("Error loading researcher feedback preview:", error)
    return null
  }
}
