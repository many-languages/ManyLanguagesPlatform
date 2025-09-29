import StudyList from "./components/StudyList"
import { getStudies } from "./queries/getStudies"
import Link from "next/link"
import PaginationControls from "../../components/PaginationControls"
import { Suspense } from "react"
import { getBlitzContext } from "../../blitz-server"
import { redirect } from "next/navigation"
import PaginationControlsSkeleton from "../../components/PaginationControlsSkeleton"
import StudyListSkeleton from "./components/StudyListSkeleton"

const ITEMS_PER_PAGE = 10

export const metadata = {
  title: "My Studies",
}

async function StudiesContent({ page, userId }: { page: number; userId: number }) {
  const result = await getStudies({
    where: {
      OR: [
        { researchers: { some: { userId } } },
        { participations: { some: { participantId: userId } } },
      ],
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
      <Link className="btn btn-primary mt-2" href={"/studies/new"}>
        Create Study
      </Link>
    </>
  )
}

export default async function StudiesPage({ searchParams }: { searchParams: { page?: string } }) {
  const page = Number(searchParams.page || 0)
  const { session } = await getBlitzContext()
  if (!session.userId) redirect("/login")

  return (
    <main>
      <h1 className="text-3xl flex justify-center mb-2">My studies</h1>
      <StudiesContent page={page} userId={session.userId} />
    </main>
  )
}
