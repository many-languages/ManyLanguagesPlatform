"use client"
import StudyList from "./components/StudyList"
import { usePaginatedQuery } from "@blitzjs/rpc"
import getStudies from "./queries/getStudies"
import Link from "next/link"
import PaginationControls from "../../components/PaginationControls"
import { useSearchParams } from "next/navigation"
import { useCurrentUser } from "../../users/hooks/useCurrentUser"

const ITEMS_PER_PAGE = 10

export default function StudiesPage() {
  const currentUser = useCurrentUser()
  const searchParams = useSearchParams()
  const page = Number(searchParams.get("page") || 0)

  // Get all ongoing studies
  const [result] = usePaginatedQuery(getStudies, {
    where: {
      OR: [
        { researchers: { some: { userId: currentUser?.id } } },
        { participations: { some: { participantId: currentUser?.id } } },
      ],
    },
    orderBy: { createdAt: "desc" },
    skip: ITEMS_PER_PAGE * page,
    take: ITEMS_PER_PAGE,
  })

  if (!result) return <div>Loading…</div>

  const { studies, hasMore } = result

  return (
    <main>
      <h1 className="text-3xl flex justify-center mb-2">My studies</h1>
      <StudyList studies={studies} />
      <PaginationControls page={page} hasMore={hasMore} />
      <Link className="btn btn-primary mt-2" href={"/studies/new"}>
        Create Study
      </Link>
    </main>
  )
}
