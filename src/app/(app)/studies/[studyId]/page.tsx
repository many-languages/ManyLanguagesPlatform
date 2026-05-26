import { Suspense } from "react"
import { notFound, redirect } from "next/navigation"
import { getBlitzContext } from "@/src/app/blitz-server"
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
  StudyInformationCard,
  parseStudyIdParam,
} from "@/src/features/studies"

export default async function StudyPage({ params }: { params: Promise<{ studyId: string }> }) {
  const { studyId: studyIdRaw } = await params
  const studyId = parseStudyIdParam(studyIdRaw)

  if (studyId === null) {
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

    if (pageData.kind === "viewer") {
      return (
        <main>
          <StudyHeader study={pageData.study} />
          <StudyInformationCard study={pageData.study} userRole="RESEARCHER" />
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
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "NotFoundError") {
      notFound()
    }
    if (error instanceof Error && error.name === "AuthorizationError") {
      const { session } = await getBlitzContext()
      if (!session.userId) {
        redirect("/login")
      }
      notFound()
    }
    throw error
  }
}
