import { Suspense } from "react"
import { notFound } from "next/navigation"
import {
  getStudyPageRsc,
  canEditStudySetup,
  ResearcherData,
  ResearcherDataSkeleton,
  ParticipantData,
  ParticipantDataSkeleton,
  SetupProgressCard,
  StudyHeader,
  StudyStatusControl,
} from "@/src/features/studies"

export default async function StudyPage({ params }: { params: Promise<{ studyId: string }> }) {
  const { studyId: studyIdRaw } = await params
  const studyId = Number(studyIdRaw)

  if (!Number.isFinite(studyId)) {
    notFound()
  }

  try {
    const pageData = await getStudyPageRsc(studyId)

    if (pageData.kind === "researcher") {
      const { study } = pageData
      const canEditSetup = canEditStudySetup(study)

      return (
        <main>
          <StudyHeader study={study} />

          <div className="mt-4 flex justify-center">
            <StudyStatusControl study={study} />
          </div>

          <SetupProgressCard study={study} canEditStudySetup={canEditSetup} />

          <Suspense fallback={<ResearcherDataSkeleton />}>
            <ResearcherData studyId={studyId} study={study} canEditStudySetup={canEditSetup} />
          </Suspense>
        </main>
      )
    }

    return (
      <main>
        <StudyHeader study={pageData.study} />

        <Suspense fallback={<ParticipantDataSkeleton />}>
          <ParticipantData studyId={studyId} study={pageData.study} />
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
