import PaginationControls from "@/src/components/ui/PaginationControls"
import { redirect } from "next/navigation"
import {
  StudyList,
  StudiesViewTabs,
  ParticipantStudiesViewTabs,
  CreateStudyButton,
  getParticipantStudiesWithStatus,
  getResearcherStudiesPageSlice,
  parseParticipantStudyViewQueryParam,
  parseStudyViewQueryParam,
  STUDIES_LIST_PAGE_SIZE,
  type ParticipantStudyView,
  type StudyView,
} from "@/src/features/studies"
import { getBlitzContext } from "@/src/app/blitz-server"

type SessionRole = "RESEARCHER" | "PARTICIPANT" | "ADMIN" | "SUPERADMIN"

/** Canonical `/studies` URL when dropping invalid query keys (preserves valid page). */
function studiesListPath(page: number): string {
  const sp = new URLSearchParams()
  if (page > 0) sp.set("page", String(page))
  const q = sp.toString()
  return q ? `/studies?${q}` : "/studies"
}

export const metadata = {
  title: "My Studies",
}

async function ResearcherStudiesContent({ page, view }: { page: number; view: StudyView }) {
  const {
    studies: paginatedStudies,
    hasMore,
    extraQuery,
  } = await getResearcherStudiesPageSlice({
    page,
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
  view,
}: {
  page: number
  view: ParticipantStudyView
}) {
  const { studies, hasMore } = await getParticipantStudiesWithStatus(
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
  const rawPage = Number(params.page ?? 0)
  const page = Number.isFinite(rawPage) && rawPage >= 0 ? Math.floor(rawPage) : 0

  const { session } = await getBlitzContext()
  if (!session.userId) redirect("/login")

  const role = (session.role ?? "PARTICIPANT") as SessionRole
  const canManageStudies = role !== "PARTICIPANT"
  const isParticipant = role === "PARTICIPANT"

  let researcherView!: StudyView
  let participantView!: ParticipantStudyView

  if (isParticipant) {
    const parsed = parseParticipantStudyViewQueryParam(params.view)
    if (!parsed.success) {
      redirect(studiesListPath(page))
    }
    participantView = parsed.view
  } else {
    const parsed = parseStudyViewQueryParam(params.view)
    if (!parsed.success) {
      redirect(studiesListPath(page))
    }
    researcherView = parsed.view
  }

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
        <ResearcherStudiesContent page={page} view={researcherView} />
      ) : (
        <ParticipantStudiesContent page={page} view={participantView} />
      )}
    </main>
  )
}
