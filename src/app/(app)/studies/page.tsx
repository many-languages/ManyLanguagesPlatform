import StudyList from "./components/client/StudyList"
import { getStudies } from "./queries/getStudies"
import type { StudyWithLatestUpload } from "./queries/getStudies"
import PaginationControls from "./components/PaginationControls"
import { getBlitzContext } from "../../blitz-server"
import { redirect } from "next/navigation"
import { Prisma } from "@/db"
import StudiesFilterBar from "./components/client/StudiesFilterBar"
import { NavigationButton } from "@/src/app/components/NavigationButton"
import { isSetupComplete } from "./[studyId]/setup/utils/setupStatus"

type SessionRole = "RESEARCHER" | "PARTICIPANT" | "ADMIN"

const ITEMS_PER_PAGE = 7
const MAX_STUDIES_FOR_SETUP_FILTER = 500

export const metadata = {
  title: "My Studies",
}

function buildExtraQuery(filters: {
  showArchived: boolean
  active: boolean
  setupComplete: boolean
}) {
  const q: Record<string, string> = {}
  if (filters.showArchived) q.showArchived = "1"
  if (filters.active) q.active = "1"
  if (filters.setupComplete) q.setupComplete = "1"
  return q
}

async function StudiesContent({
  page,
  userId,
  showArchived,
  activeOnly,
  setupCompleteOnly,
}: {
  page: number
  userId: number
  showArchived: boolean
  activeOnly: boolean
  setupCompleteOnly: boolean
}) {
  // Base visibility: studies I own or participate in
  const baseWhere: Prisma.StudyWhereInput = {
    OR: [{ researchers: { some: { userId } } }, { participations: { some: { userId } } }],
  }

  // Apply archived filter
  let where: Prisma.StudyWhereInput = showArchived
    ? baseWhere
    : { AND: [baseWhere, { archived: false }] }

  // Apply active (OPEN) filter
  if (activeOnly) {
    where = { AND: [where, { status: "OPEN" }] }
  }

  const extraQuery = buildExtraQuery({
    showArchived,
    active: activeOnly,
    setupComplete: setupCompleteOnly,
  })

  let paginatedStudies: StudyWithLatestUpload[]
  let hasMore: boolean

  if (setupCompleteOnly) {
    // Setup completeness requires JS filtering (isSetupComplete uses latestJatosStudyUpload).
    // Fetch up to MAX_STUDIES_FOR_SETUP_FILTER, filter, then paginate in memory.
    const result = await getStudies({
      where,
      orderBy: { createdAt: "desc" },
      skip: 0,
      take: MAX_STUDIES_FOR_SETUP_FILTER,
    })
    const filtered = result.studies.filter((s) => isSetupComplete(s as StudyWithLatestUpload))
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
      <PaginationControls
        page={page}
        hasMore={hasMore}
        extraQuery={Object.keys(extraQuery).length > 0 ? extraQuery : undefined}
      />
    </>
  )
}

export default async function StudiesPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string
    showArchived?: string
    active?: string
    setupComplete?: string
  }>
}) {
  const params = await searchParams
  const page = Number(params.page || 0)
  const showArchived = params.showArchived === "1" || params.showArchived === "true"
  const activeOnly = params.active === "1"
  const setupCompleteOnly = params.setupComplete === "1"

  const { session } = await getBlitzContext()
  if (!session.userId) redirect("/login")

  const role = (session.role ?? "PARTICIPANT") as SessionRole
  const canManageStudies = role !== "PARTICIPANT"
  const effectiveShowArchived = canManageStudies ? showArchived : false
  const effectiveActiveOnly = canManageStudies ? activeOnly : false
  const effectiveSetupCompleteOnly = canManageStudies ? setupCompleteOnly : false

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
          <StudiesFilterBar />
        </div>
      )}
      <StudiesContent
        page={page}
        userId={session.userId}
        showArchived={effectiveShowArchived}
        activeOnly={effectiveActiveOnly}
        setupCompleteOnly={effectiveSetupCompleteOnly}
      />
    </main>
  )
}
