"use client"

import { useRouter, usePathname, useSearchParams } from "next/navigation"
import React from "react"

interface PaginationControlsProps {
  page: number
  hasMore: boolean
}

const PaginationControls: React.FC<PaginationControlsProps> = ({ page, hasMore }) => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const createQueryString = (name: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set(name, value)
    return params.toString()
  }

  const goToPreviousPage = () => {
    if (page > 0) {
      router.push(`${pathname}?${createQueryString("page", String(page - 1))}` as any)
    }
  }

  const goToNextPage = () => {
    if (hasMore) {
      router.push(`${pathname}?${createQueryString("page", String(page - 1))}` as any)
    }
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
