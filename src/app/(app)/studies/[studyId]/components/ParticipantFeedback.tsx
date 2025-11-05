import { getParticipantPseudonymRsc } from "../../queries/getParticipantPseudonym"
import { getStudyDataByCommentRsc } from "../../queries/getStudyDataByComment"
import { getFeedbackTemplateRsc } from "../setup/step4/queries/getFeedbackTemplate"
import FeedbackCard from "./client/FeedbackCard"

interface ParticipantFeedbackProps {
  studyId: number
}

export default async function ParticipantFeedback({ studyId }: ParticipantFeedbackProps) {
  try {
    // Get participant's pseudonym
    const participant = await getParticipantPseudonymRsc(studyId)
    if (!participant) {
      return null
    }

    // Get participant's results using their pseudonym as the comment
    const { enrichedResult } = await getStudyDataByCommentRsc(studyId, participant.pseudonym)

    // Get feedback template
    const template = await getFeedbackTemplateRsc(studyId)

    if (!template) {
      return null
    }

    return <FeedbackCard studyId={studyId} enrichedResult={enrichedResult} template={template} />
  } catch (error) {
    console.error("Error loading participant feedback:", error)
    return null
  }
}
