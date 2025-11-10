"use client"

import { useCallback, useTransition } from "react"
import { useRouter } from "next/navigation"
import type { Route } from "next"

type RouteLike = Route | string

export function usePendingNavigation() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const startNavigation = useCallback(
    (callback: () => void) => {
      startTransition(callback)
    },
    [startTransition]
  )

  const push = useCallback(
    (href: RouteLike) => {
      startNavigation(() => {
        router.push(href as Route)
      })
    },
    [router, startNavigation]
  )

  const replace = useCallback(
    (href: RouteLike) => {
      startNavigation(() => {
        router.replace(href as Route)
      })
    },
    [router, startNavigation]
  )

  const refresh = useCallback(() => {
    startNavigation(() => {
      router.refresh()
    })
  }, [router, startNavigation])

  return {
    isPending,
    startNavigation,
    push,
    replace,
    refresh,
  }
}
