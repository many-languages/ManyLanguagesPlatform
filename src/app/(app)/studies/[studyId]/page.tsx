import { Suspense } from "react"
import { notFound } from "next/navigation"
import {
  getStudyRsc,
  canEditStudySetup,
  ResearcherData,
  ParticipantData,
  SetupProgressCard,
  StudyHeader,
  StudyStatusControl,
} from "@/src/features/studies"
import { getBlitzContext } from "@/src/app/blitz-server"

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

    const study = await getStudyRsc(studyId)
    const canEditSetup = canEditStudySetup(study)
    const isResearcherOnStudy = study.researchers.some(
      (researcher) => researcher.userId === session.userId
    )

    return (
      <main>
        <StudyHeader study={study} />

        {isResearcherOnStudy && (
          <div className="mt-4 flex justify-center">
            <StudyStatusControl study={study} />
          </div>
        )}

        {isResearcherOnStudy && (
          <SetupProgressCard study={study} canEditStudySetup={canEditSetup} />
        )}

        {isResearcherOnStudy && (
          <Suspense fallback={<div className="skeleton h-32 w-full mt-4" />}>
            <ResearcherData studyId={studyId} study={study} canEditStudySetup={canEditSetup} />
          </Suspense>
        )}

        {!isResearcherOnStudy && (
          <Suspense fallback={<div className="skeleton h-16 w-full mt-4" />}>
            <ParticipantData studyId={studyId} study={study} />
          </Suspense>
        )}
      </main>
    )
  } catch (error: any) {
    if (error.name === "NotFoundError") {
      notFound()
    }
    throw error
  }
}
