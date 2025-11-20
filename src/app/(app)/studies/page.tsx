import StudyList from "./components/client/StudyList"
import { getStudies } from "./queries/getStudies"
import PaginationControls from "./components/PaginationControls"
import { getBlitzContext } from "../../blitz-server"
import { redirect } from "next/navigation"
import { Prisma } from "@/db"
import ShowArchivedToggle from "./components/client/ShowArchivedToggle"
import { NavigationButton } from "@/src/app/components/NavigationButton"

type SessionRole = "RESEARCHER" | "PARTICIPANT" | "ADMIN"

const ITEMS_PER_PAGE = 7

export const metadata = {
  title: "My Studies",
}

async function StudiesContent({
  page,
  userId,
  showArchived,
  canManage,
}: {
  page: number
  userId: number
  showArchived: boolean
  canManage: boolean
}) {
  // Base visibility: studies I own or participate in
  const baseWhere: Prisma.StudyWhereInput = {
    OR: [{ researchers: { some: { userId } } }, { participations: { some: { userId } } }],
  }

  // Apply archived filter unless explicitly shown
  const where: Prisma.StudyWhereInput = showArchived
    ? baseWhere
    : { AND: [baseWhere, { archived: false }] }

  const result = await getStudies({
    where,
    orderBy: { createdAt: "desc" },
    skip: ITEMS_PER_PAGE * page,
    take: ITEMS_PER_PAGE,
  })

  const { studies, hasMore } = result

  return (
    <>
      <StudyList studies={studies} showJoinButton={false} />
      <PaginationControls
        page={page}
        hasMore={hasMore}
        extraQuery={showArchived ? { showArchived: "1" } : {}}
      />
    </>
  )
}

export default async function StudiesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; showArchived?: string }>
}) {
  const params = await searchParams
  const page = Number(params.page || 0)
  const showArchived = params.showArchived === "1" || params.showArchived === "true"

  const { session } = await getBlitzContext()
  if (!session.userId) redirect("/login")

  const role = (session.role ?? "PARTICIPANT") as SessionRole
  const canManageStudies = role !== "PARTICIPANT"
  const effectiveShowArchived = canManageStudies ? showArchived : false

  return (
    <main>
      <h1 className="text-3xl flex justify-center mb-2">My studies</h1>
      {canManageStudies && (
        <div className="flex justify-between items-center mb-6">
          <NavigationButton
            className="btn btn-secondary"
            href={"/studies/new"}
            pendingText="Creating"
          >
            Create Study
          </NavigationButton>
          <ShowArchivedToggle />
        </div>
      )}
      <StudiesContent
        page={page}
        userId={session.userId}
        showArchived={effectiveShowArchived}
        canManage={canManageStudies}
      />
    </main>
  )
}
