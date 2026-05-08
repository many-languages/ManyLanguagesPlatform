import PaginationControls from "@/src/components/ui/PaginationControls"
import { redirect } from "next/navigation"
import {
  StudyList,
  StudiesViewTabs,
  ParticipantStudiesViewTabs,
  CreateStudyButton,
  getParticipantStudiesWithStatus,
  getResearcherStudiesPageSlice,
  parseStudyView,
  parseParticipantStudyView,
  STUDIES_LIST_PAGE_SIZE,
} from "@/src/features/studies"
import type { ParticipantStudyView, StudyView } from "@/src/features/studies"
import { getBlitzContext } from "@/src/app/blitz-server"

type SessionRole = "RESEARCHER" | "PARTICIPANT" | "ADMIN" | "SUPERADMIN"

export const metadata = {
  title: "My Studies",
}

async function ResearcherStudiesContent({
  page,
  userId,
  view,
}: {
  page: number
  userId: number
  view: StudyView
}) {
  const {
    studies: paginatedStudies,
    hasMore,
    extraQuery,
  } = await getResearcherStudiesPageSlice({
    page,
    userId,
    view,
  })
  return (
    <>
      <StudyList studies={paginatedStudies} showJoinButton={false} />
      <PaginationControls page={page} hasMore={hasMore} extraQuery={extraQuery} />
    </>
  )
}

async function ParticipantStudiesContent({
  page,
  userId,
  view,
}: {
  page: number
  userId: number
  view: ParticipantStudyView
}) {
  const { studies, hasMore } = await getParticipantStudiesWithStatus(
    userId,
    view,
    page,
    STUDIES_LIST_PAGE_SIZE
  )
  const extraQuery = view !== "all" ? { view } : undefined

  return (
    <>
      <StudyList studies={studies} showJoinButton={false} />
      <PaginationControls page={page} hasMore={hasMore} extraQuery={extraQuery} />
    </>
  )
}

export default async function StudiesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; view?: string }>
}) {
  const params = await searchParams
  const page = Number(params.page || 0)

  const { session } = await getBlitzContext()
  if (!session.userId) redirect("/login")

  const role = (session.role ?? "PARTICIPANT") as SessionRole
  const canManageStudies = role !== "PARTICIPANT"
  const isParticipant = role === "PARTICIPANT"
  const participantView = parseParticipantStudyView(params.view)
  const researcherView = parseStudyView(params.view)

  return (
    <main>
      <h1 className="text-3xl flex justify-center mb-2">My studies</h1>
      {canManageStudies && (
        <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
          <CreateStudyButton className="btn btn-secondary" />
          <StudiesViewTabs currentView={researcherView} />
        </div>
      )}
      {isParticipant && (
        <div className="flex flex-wrap justify-end items-center mb-6 gap-4">
          <ParticipantStudiesViewTabs currentView={participantView} />
        </div>
      )}
      {canManageStudies ? (
        <ResearcherStudiesContent page={page} userId={session.userId} view={researcherView} />
      ) : (
        <ParticipantStudiesContent page={page} userId={session.userId} view={participantView} />
      )}
    </main>
  )
}
