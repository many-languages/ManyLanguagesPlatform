import { notFound } from "next/navigation"
import { getStudyRsc } from "../queries/getStudy"
import StudyContent from "./components/client/StudyContent"
import { getResultsMetadata } from "@/src/lib/jatos/api/getResultsMetadata"
import { getStudyProperties } from "@/src/lib/jatos/api/getStudyProperties"
import { getStudyParticipantRsc } from "../queries/getStudyParticipant"
import { getBlitzContext } from "@/src/app/blitz-server"
import { getFeedbackTemplateRsc } from "./setup/step4/queries/getFeedbackTemplate"

export default async function StudyPage({ params }: { params: Promise<{ studyId: string }> }) {
  const { studyId: studyIdRaw } = await params
  const studyId = Number(studyIdRaw)

  if (!Number.isFinite(studyId)) {
    notFound()
  }

  try {
    const { session } = await getBlitzContext()
    if (!session.userId) {
      throw new Error("Not authenticated")
    }

    // Fetch study data
    const study = await getStudyRsc(studyId)

    // Initialize JATOS metadata and study properties with null
    let metadata = null
    let properties = null

    // Only fetch from JATOS if IDs exist
    if (study.jatosStudyId && study.jatosStudyUUID) {
      ;[metadata, properties] = await Promise.all([
        getResultsMetadata({ studyIds: [study.jatosStudyId] }),
        getStudyProperties(study.jatosStudyUUID),
      ])
    }

    // Fetch role-specific data in parallel
    const [feedbackTemplate, participant] = await Promise.all([
      // Only fetch feedback template if user is a researcher
      session.role === "RESEARCHER"
        ? getFeedbackTemplateRsc(studyId).catch(() => null)
        : Promise.resolve(null),
      // Only fetch participant data if user is a participant
      session.role === "PARTICIPANT"
        ? getStudyParticipantRsc(studyId).catch(() => null)
        : Promise.resolve(null),
    ])

    // Return [StudyId] content with pre-fetched data
    return (
      <StudyContent
        study={study}
        metadata={metadata}
        properties={properties}
        feedbackTemplate={feedbackTemplate}
        participant={participant}
      />
    )
  } catch (error: any) {
    if (error.name === "NotFoundError") {
      notFound()
    }
    throw error
  }
}
