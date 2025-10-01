import StudyList from "../studies/components/StudyList"
import { getStudies } from "../studies/queries/getStudies"
import PaginationControls from "../../components/PaginationControls"
import { Suspense } from "react"
import { getBlitzContext } from "../../blitz-server"
import { redirect } from "next/navigation"
import PaginationControlsSkeleton from "../../components/PaginationControlsSkeleton"
import StudyListSkeleton from "../studies/components/StudyListSkeleton"

const ITEMS_PER_PAGE = 10

export const metadata = {
  title: "Explore Studies",
}

async function ExploreContent({ page, userId }: { page: number; userId: number }) {
  const result = await getStudies({
    where: {
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
      <Suspense fallback={<StudyListSkeleton />}>
        <StudyList studies={studies} />
      </Suspense>
      <Suspense fallback={<PaginationControlsSkeleton />}>
        <PaginationControls page={page} hasMore={hasMore} />
      </Suspense>
    </>
  )
}

export default async function ExplorePage({ searchParams }: { searchParams: { page?: string } }) {
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
