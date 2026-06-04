import { Suspense } from "react"
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
  StudyListSkeleton,
  PaginationControlsSkeleton,
  type ParticipantStudyView,
  type StudyView,
} from "@/src/features/studies"
import { getBlitzContext } from "@/src/app/blitz-server"
import { parsePageQueryParam } from "@/src/lib/searchParams/parsePageQueryParam"

type SessionRole = "RESEARCHER" | "PARTICIPANT" | "ADMIN" | "SUPERADMIN"

/** Canonical `/studies` URL when dropping invalid query keys (preserves valid page). */
function studiesListPath(page: number): `/studies` | `/studies?${string}` {
  const sp = new URLSearchParams()
  if (page > 0) sp.set("page", String(page))
  const q = sp.toString()
  return q ? `/studies?${q}` : "/studies"
}

export const metadata = {
  title: "My Studies",
}

const RESEARCHER_EMPTY_MESSAGES: Record<StudyView, string> = {
  all: "No studies yet.",
  active: "No active studies.",
  archived: "No archived studies.",
  incomplete: "All your studies have complete setup.",
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
      <StudyList
        studies={paginatedStudies}
        showJoinButton={false}
        emptyMessage={RESEARCHER_EMPTY_MESSAGES[view]}
      />
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

function StudiesListFallback() {
  return (
    <>
      <StudyListSkeleton />
      <PaginationControlsSkeleton />
    </>
  )
}

export default async function StudiesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; view?: string }>
}) {
  const params = await searchParams
  const page = parsePageQueryParam(params.page)

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
        <Suspense fallback={<StudiesListFallback />}>
          <ResearcherStudiesContent page={page} view={researcherView} />
        </Suspense>
      ) : (
        <Suspense fallback={<StudiesListFallback />}>
          <ParticipantStudiesContent page={page} view={participantView} />
        </Suspense>
      )}
    </main>
  )
}
