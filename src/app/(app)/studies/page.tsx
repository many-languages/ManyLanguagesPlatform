import StudyList from "./components/client/StudyList"
import { getStudies } from "./queries/getStudies"
import type { StudyWithLatestUpload } from "./queries/getStudies"
import { getParticipantStudiesWithStatus } from "./queries/getParticipantStudiesWithStatus"
import PaginationControls from "./components/PaginationControls"
import { getBlitzContext } from "../../blitz-server"
import { redirect } from "next/navigation"
import { Prisma } from "@/db"
import StudiesViewTabs from "./components/client/StudiesViewTabs"
import ParticipantStudiesViewTabs from "./components/client/ParticipantStudiesViewTabs"
import { NavigationButton } from "@/src/app/components/NavigationButton"
import { isSetupComplete } from "./[studyId]/setup/utils/setupStatus"
import { parseStudyView, type StudyView } from "./utils/studyView"
import { parseParticipantStudyView, type ParticipantStudyView } from "./utils/participantStudyView"

type SessionRole = "RESEARCHER" | "PARTICIPANT" | "ADMIN"

const ITEMS_PER_PAGE = 7
const MAX_STUDIES_FOR_SETUP_FILTER = 500

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
  const baseWhere: Prisma.StudyWhereInput = {
    OR: [{ researchers: { some: { userId } } }, { participations: { some: { userId } } }],
  }

  let where: Prisma.StudyWhereInput
  switch (view) {
    case "archived":
      where = { AND: [baseWhere, { archived: true }] }
      break
    case "active":
      where = { AND: [baseWhere, { archived: false }, { status: "OPEN" }] }
      break
    case "incomplete":
      where = { AND: [baseWhere, { archived: false }] }
      break
    default:
      // all
      where = { AND: [baseWhere, { archived: false }] }
  }

  const extraQuery = view !== "all" ? { view } : undefined

  let paginatedStudies: StudyWithLatestUpload[]
  let hasMore: boolean

  if (view === "incomplete") {
    const result = await getStudies({
      where: { AND: [baseWhere, { archived: false }] },
      orderBy: { createdAt: "desc" },
      skip: 0,
      take: MAX_STUDIES_FOR_SETUP_FILTER,
    })
    const filtered = result.studies.filter((s) => !isSetupComplete(s as StudyWithLatestUpload))
    const start = page * ITEMS_PER_PAGE
    paginatedStudies = filtered.slice(start, start + ITEMS_PER_PAGE)
    hasMore = filtered.length > start + ITEMS_PER_PAGE
  } else {
    const result = await getStudies({
      where,
      orderBy: { createdAt: "desc" },
      skip: ITEMS_PER_PAGE * page,
      take: ITEMS_PER_PAGE,
    })
    paginatedStudies = result.studies
    hasMore = result.hasMore
  }

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
    ITEMS_PER_PAGE
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
          <NavigationButton
            className="btn btn-secondary"
            href={"/studies/new"}
            pendingText="Creating"
          >
            Create Study
          </NavigationButton>
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
