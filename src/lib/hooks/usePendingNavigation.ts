"use client"

import { useCallback, useEffect, useState, useTransition } from "react"
import { useRouter, usePathname } from "next/navigation"
import type { Route } from "next"

type RouteLike = Route | string

export function usePendingNavigation() {
  const router = useRouter()
  const pathname = usePathname()
  const [isPendingTransition, startTransition] = useTransition()
  const [isNavigating, setIsNavigating] = useState(false)

  // Clear the navigating flag once the new page has actually rendered
  // (pathname change = RSC payload arrived and the new page is live)
  useEffect(() => {
    setIsNavigating(false)
  }, [pathname])

  const isPending = isPendingTransition || isNavigating

  const startNavigation = useCallback(
    (callback: () => void) => {
      startTransition(callback)
    },
    [startTransition]
  )

  const push = useCallback(
    (href: RouteLike) => {
      // Skip the isNavigating flag for same-route navigations: pathname won't
      // change, so the effect would never fire and the flag would never clear.
      if ((href as string) !== pathname) setIsNavigating(true)
      startTransition(() => {
        router.push(href as Route)
      })
    },
    [router, startTransition, pathname]
  )

  const replace = useCallback(
    (href: RouteLike) => {
      if ((href as string) !== pathname) setIsNavigating(true)
      startTransition(() => {
        router.replace(href as Route)
      })
    },
    [router, startTransition, pathname]
  )

  const refresh = useCallback(() => {
    startTransition(() => {
      router.refresh()
    })
  }, [router, startTransition])

  return {
    isPending,
    startNavigation,
    push,
    replace,
    refresh,
  }
}
