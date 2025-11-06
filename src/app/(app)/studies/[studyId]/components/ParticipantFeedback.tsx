import { getParticipantPseudonymRsc } from "../../queries/getParticipantPseudonym"
import { getStudyDataByCommentRsc } from "../../queries/getStudyDataByComment"
import { getFeedbackTemplateRsc } from "../setup/step4/queries/getFeedbackTemplate"
import FeedbackCard from "./client/FeedbackCard"
import { getResultsMetadata } from "@/src/lib/jatos/api/getResultsMetadata"
import { getResultsData } from "@/src/lib/jatos/api/getResultsData"
import { parseJatosZip } from "@/src/lib/jatos/api/parseJatosZip"
import { matchJatosDataToMetadata } from "@/src/lib/jatos/api/matchJatosDataToMetadata"
import db from "db"
import { cache } from "react"

// Server-side helper to get all enriched results for a study
const getAllEnrichedResultsRsc = cache(async (studyId: number) => {
  const study = await db.study.findUnique({
    where: { id: studyId },
    select: { jatosStudyId: true },
  })
  if (!study) throw new Error("Study not found")

  // Get metadata
  const metadata = await getResultsMetadata({ studyIds: [study.jatosStudyId] })

  // Get all results
  const result = await getResultsData({ studyIds: String(study.jatosStudyId) })
  if (!result.success) {
    throw new Error("Failed to fetch results from JATOS")
  }

  // Parse ZIP
  const files = await parseJatosZip(result.data)

  // Match and enrich data
  return matchJatosDataToMetadata(metadata, files)
})

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

    // Get all results for "across" scope statistics
    const allEnrichedResults = await getAllEnrichedResultsRsc(studyId)

    return (
      <FeedbackCard
        studyId={studyId}
        enrichedResult={enrichedResult}
        template={template}
        allEnrichedResults={allEnrichedResults}
      />
    )
  } catch (error) {
    console.error("Error loading participant feedback:", error)
    return null
  }
}
