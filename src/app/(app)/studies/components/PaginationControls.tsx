"use client"

import { Route } from "next"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import React from "react"

interface PaginationControlsProps {
  page: number
  hasMore: boolean
  /** extra params to preserve/force across pagination (e.g. { showArchived: "1" }) */
  extraQuery?: Record<string, string | number | boolean | undefined>
}

const PaginationControls: React.FC<PaginationControlsProps> = ({ page, hasMore, extraQuery }) => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const buildHref = (nextPage: number) => {
    const params = new URLSearchParams(searchParams.toString())

    // apply/override extraQuery
    if (extraQuery) {
      for (const [k, v] of Object.entries(extraQuery)) {
        if (v === undefined || v === null) params.delete(k)
        else params.set(k, String(v))
      }
    }

    params.set("page", String(nextPage))
    const qs = params.toString()
    return (qs ? `${pathname}?${qs}` : pathname) as Route
  }

  const goToPreviousPage = () => {
    if (page > 0) router.push(buildHref(page - 1))
  }

  const goToNextPage = () => {
    if (hasMore) router.push(buildHref(page + 1))
  }

  return (
    <div className="join grid grid-cols-2 mt-4">
      <button
        className="join-item btn btn-secondary"
        disabled={page === 0}
        onClick={goToPreviousPage}
      >
        Previous
      </button>
      <button className="join-item btn btn-secondary" disabled={!hasMore} onClick={goToNextPage}>
        Next
      </button>
    </div>
  )
}

export default PaginationControls
