import StudyList from "../studies/components/client/StudyList"
import { getStudies } from "../studies/queries/getStudies"
import PaginationControls from "../studies/components/PaginationControls"
import { getBlitzContext } from "../../blitz-server"
import { redirect } from "next/navigation"

const ITEMS_PER_PAGE = 10

export const metadata = {
  title: "Explore Studies",
}

async function ExploreContent({ page, userId }: { page: number; userId: number }) {
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
      <StudyList studies={studies} showJoinButton={true} showOpenButton={false} />
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
  const page = Number(params.page || 0)

  const { session } = await getBlitzContext()
  if (!session.userId) redirect("/login")

  return (
    <main>
      <h1 className="text-3xl flex justify-center mb-2">Explore</h1>
      <ExploreContent page={page} userId={session.userId} />
    </main>
  )
}
