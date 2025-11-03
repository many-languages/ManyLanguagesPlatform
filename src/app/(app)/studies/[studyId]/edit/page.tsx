import { notFound } from "next/navigation"
import { getStudyRsc } from "../../queries/getStudy"
import EditStudyForm from "../components/client/EditStudyForm"
import StudyFormSkeleton from "../../components/skeletons/StudyFormSkeleton"
import { Suspense } from "react"

export default async function EditStudy({ params }: { params: Promise<{ studyId: string }> }) {
  const { studyId: studyIdRaw } = await params
  const studyId = Number(studyIdRaw)

  if (!Number.isFinite(studyId)) {
    notFound()
  }

  try {
    const study = await getStudyRsc(studyId)

    return (
      <main>
        <Suspense fallback={<StudyFormSkeleton />}>
          <EditStudyForm study={study} studyId={studyId} />
        </Suspense>
      </main>
    )
  } catch (error: any) {
    if (error.name === "NotFoundError") {
      notFound()
    }
    throw error
  }
}
