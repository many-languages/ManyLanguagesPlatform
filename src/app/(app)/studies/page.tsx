import StudyList from "./components/client/StudyList"
import { getStudies } from "./queries/getStudies"
import type { StudyWithLatestUpload } from "./queries/getStudies"
import PaginationControls from "./components/PaginationControls"
import { getBlitzContext } from "../../blitz-server"
import { redirect } from "next/navigation"
import { Prisma } from "@/db"
import StudiesViewTabs from "./components/client/StudiesViewTabs"
import { NavigationButton } from "@/src/app/components/NavigationButton"
import { isSetupComplete } from "./[studyId]/setup/utils/setupStatus"
import { parseStudyView, type StudyView } from "./utils/studyView"

type SessionRole = "RESEARCHER" | "PARTICIPANT" | "ADMIN"

const ITEMS_PER_PAGE = 7
const MAX_STUDIES_FOR_SETUP_FILTER = 500

export const metadata = {
  title: "My Studies",
}

async function StudiesContent({
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

export default async function StudiesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; view?: string }>
}) {
  const params = await searchParams
  const page = Number(params.page || 0)
  const view = parseStudyView(params.view)

  const { session } = await getBlitzContext()
  if (!session.userId) redirect("/login")

  const role = (session.role ?? "PARTICIPANT") as SessionRole
  const canManageStudies = role !== "PARTICIPANT"
  const effectiveView = canManageStudies ? view : "all"

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
          <StudiesViewTabs currentView={effectiveView} />
        </div>
      )}
      <StudiesContent page={page} userId={session.userId} view={effectiveView} />
    </main>
  )
}
