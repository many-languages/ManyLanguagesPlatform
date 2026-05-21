import { StudyList, getStudies } from "@/src/features/studies"
import PaginationControls from "@/src/components/ui/PaginationControls"
import { parsePageQueryParam } from "@/src/lib/searchParams/parsePageQueryParam"
import { getBlitzContext } from "../../blitz-server"
import { redirect } from "next/navigation"
import { UserRole } from "@/db"

const ITEMS_PER_PAGE = 10

export const metadata = {
  title: "Explore Studies",
}

async function ExploreContent({
  page,
  userId,
  isParticipant,
}: {
  page: number
  userId: number
  isParticipant: boolean
}) {
  const result = await getStudies({
    where: {
      archived: false,
      status: "OPEN",
      NOT: {
        OR: [{ researchers: { some: { userId } } }, { participations: { some: { userId } } }],
      },
    },
    orderBy: { createdAt: "desc" },
    skip: ITEMS_PER_PAGE * page,
    take: ITEMS_PER_PAGE,
  })

  const { studies, hasMore } = result

  return (
    <>
      <StudyList
        studies={studies}
        showJoinButton={true}
        showOpenButton={false}
        isParticipant={isParticipant}
      />
      <PaginationControls page={page} hasMore={hasMore} />
    </>
  )
}

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const params = await searchParams
  const page = parsePageQueryParam(params.page)

  const { session } = await getBlitzContext()
  if (!session.userId) redirect("/login")

  const isParticipant = session.role === UserRole.PARTICIPANT

  return (
    <main>
      <h1 className="text-3xl flex justify-center mb-2">Explore</h1>
      <ExploreContent page={page} userId={session.userId} isParticipant={isParticipant} />
    </main>
  )
}
