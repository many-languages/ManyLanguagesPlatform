import { Suspense } from "react"
import { notFound } from "next/navigation"
import { getStudyRsc } from "../queries/getStudy"
import { getBlitzContext } from "@/src/app/blitz-server"
import ResearcherData from "./components/ResearcherData"
import ParticipantData from "./components/ParticipantData"
import SetupProgressCard from "./setup/components/SetupProgressCard"
import StudyHeader from "./components/StudyHeader"
import StudyInformationCard from "./components/client/StudyInformationCard"

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

    // Fetch core study data first (always needed for progressive loading)
    const study = await getStudyRsc(studyId)

    // Ensure role is defined (should be after authentication check)
    const userRole = session.role as "RESEARCHER" | "PARTICIPANT"

    return (
      <main>
        {/* Study header */}
        <StudyHeader study={study} />

        {/* Setup Progress Card for researchers */}
        {userRole === "RESEARCHER" && <SetupProgressCard study={study} />}

        {/* Study information */}
        <StudyInformationCard study={study} userRole={userRole} />

        {/* Researcher-specific data - progressive loading via Suspense */}
        {userRole === "RESEARCHER" && (
          <Suspense fallback={<div className="skeleton h-32 w-full mt-4" />}>
            <ResearcherData studyId={studyId} study={study} />
          </Suspense>
        )}

        {/* Participant-specific data - progressive loading via Suspense */}
        {userRole === "PARTICIPANT" && (
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
