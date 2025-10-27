import { notFound } from "next/navigation"
import { getStudyRsc } from "../queries/getStudy"
import StudyContent from "./components/client/StudyContent"
import { getResultsMetadata } from "@/src/lib/jatos/api/getResultsMetadata"
import { getStudyProperties } from "@/src/lib/jatos/api/getStudyProperties"

export default async function StudyPage({ params }: { params: Promise<{ studyId: string }> }) {
  const { studyId: studyIdRaw } = await params
  const studyId = Number(studyIdRaw)

  if (!Number.isFinite(studyId)) {
    notFound()
  }

  try {
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

    // Return [StudyId] content
    return <StudyContent study={study} metadata={metadata} properties={properties} />
  } catch (error: any) {
    if (error.name === "NotFoundError") {
      notFound()
    }
    throw error
  }
}
