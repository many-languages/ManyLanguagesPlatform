import { notFound } from "next/navigation"
import { getStudyRsc } from "../queries/getStudy"
import StudyContent from "./components/StudyContent"

export default async function StudyPage({ params }: { params: Promise<{ studyId: string }> }) {
  const { studyId: studyIdRaw } = await params
  const studyId = Number(studyIdRaw)

  if (!Number.isFinite(studyId)) {
    notFound()
  }

  try {
    const study = await getStudyRsc(studyId)
    return <StudyContent study={study} />
  } catch (error: any) {
    if (error.name === "NotFoundError") {
      notFound()
    }
    throw error
  }
}
