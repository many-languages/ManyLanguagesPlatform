import { notFound } from "next/navigation"
import { getStudyRsc } from "../queries/getStudy"
import StudyContent from "./components/StudyContent"
import { getResultsMetadata } from "@/src/app/jatos/utils/getResultsMetadata"

export default async function StudyPage({ params }: { params: Promise<{ studyId: string }> }) {
  const { studyId: studyIdRaw } = await params
  const studyId = Number(studyIdRaw)

  if (!Number.isFinite(studyId)) {
    notFound()
  }

  try {
    // Fetch study data
    const study = await getStudyRsc(studyId)

    // Fetch resultsmetadata from JATOS
    const metadata = await getResultsMetadata({ studyIds: [study.jatosStudyId] })

    // Return [StudyId] content
    return <StudyContent study={study} metadata={metadata} />
  } catch (error: any) {
    if (error.name === "NotFoundError") {
      notFound()
    }
    throw error
  }
}
