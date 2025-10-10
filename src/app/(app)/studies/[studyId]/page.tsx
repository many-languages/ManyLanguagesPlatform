import { notFound } from "next/navigation"
import { getStudyRsc } from "../queries/getStudy"
import StudyContent from "./components/StudyContent"
import { getResultsMetadata } from "@/src/app/jatos/utils/getResultsMetadata"
import { getStudyProperties } from "@/src/app/jatos/utils/getStudyProperties"

export default async function StudyPage({ params }: { params: Promise<{ studyId: string }> }) {
  const { studyId: studyIdRaw } = await params
  const studyId = Number(studyIdRaw)

  if (!Number.isFinite(studyId)) {
    notFound()
  }

  try {
    // Fetch study data
    const study = await getStudyRsc(studyId)

    const [metadata, properties] = await Promise.all([
      // Fetch results metadata from JATOS
      getResultsMetadata({ studyIds: [study.jatosStudyId] }),
      // Fetch study properties from JATOS
      getStudyProperties(study.jatosStudyUUID),
    ])

    // Return [StudyId] content
    return <StudyContent study={study} metadata={metadata} properties={properties} />
  } catch (error: any) {
    if (error.name === "NotFoundError") {
      notFound()
    }
    throw error
  }
}
