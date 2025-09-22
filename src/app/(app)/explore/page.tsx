"use client"
import { usePaginatedQuery } from "@blitzjs/rpc"
import getStudies from "../studies/queries/getStudies"
import StudyList from "../studies/components/StudyList"
import PaginationControls from "../../components/PaginationControls"
import { useSearchParams } from "next/navigation"

const ITEMS_PER_PAGE = 10

export default function ExplorePage() {
  const searchParams = useSearchParams()
  const page = Number(searchParams.get("page") || 0)

  // Get all ongoing studies
  const [result] = usePaginatedQuery(getStudies, {
    where: { status: "OPEN" },
    orderBy: { createdAt: "desc" },
    skip: ITEMS_PER_PAGE * page,
    take: ITEMS_PER_PAGE,
  })

  if (!result) return <div>Loading…</div>

  const { studies, hasMore } = result

  return (
    <main>
      <h1 className="text-3xl flex justify-center mb-2">Explore</h1>
      <StudyList studies={studies} />
      <PaginationControls page={page} hasMore={hasMore} />
    </main>
  )
}
