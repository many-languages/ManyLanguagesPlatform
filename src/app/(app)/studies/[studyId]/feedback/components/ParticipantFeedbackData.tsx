import { getFeedbackTemplateRsc } from "../queries/getFeedbackTemplate"
import ParticipantFeedback from "./client/ParticipantFeedback"
import { fetchParticipantFeedbackAction } from "../actions/fetchParticipantFeedback"

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
  try {
    // Get feedback template (doesn't change, so fetch separately)
    const template = await getFeedbackTemplateRsc(studyId)

    if (!template) {
      return null
    }

    // Use the same server action for initial fetch - single source of truth
    const result = await fetchParticipantFeedbackAction(studyId, pseudonym, jatosStudyId)

    if (!result.success) {
      console.error("Error loading participant feedback:", result.error)
      return null
    }

    return (
      <ParticipantFeedback
        studyId={studyId}
        pseudonym={pseudonym}
        jatosStudyId={jatosStudyId}
        initialEnrichedResult={result.data?.enrichedResult ?? null}
        template={template}
        initialAllEnrichedResults={result.data?.allEnrichedResults ?? []}
      />
    )
  } catch (error) {
    console.error("Error loading participant feedback:", error)
    return null
  }
}
