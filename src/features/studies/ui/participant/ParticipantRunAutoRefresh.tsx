"use client"

import { useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { useWindowResumeCheck } from "@/src/lib/utils/useWindowResumeCheck"

/** Focus and visibility events often fire together; one refresh per window is enough. */
const MIN_REFRESH_INTERVAL_MS = 5000

/**
 * Re-renders the participant study page when the participant returns to this tab, for example
 * after closing the JATOS window opened by "Run study". The server component then re-checks
 * completion and run state, so the Run button and messages reflect what happened in JATOS.
 * Renders nothing.
 */
export default function ParticipantRunAutoRefresh({ enabled }: { enabled: boolean }) {
  const router = useRouter()
  const lastRefreshRef = useRef(0)

  const handleResume = useCallback(() => {
    const now = Date.now()
    if (now - lastRefreshRef.current < MIN_REFRESH_INTERVAL_MS) return
    lastRefreshRef.current = now
    router.refresh()
  }, [router])

  useWindowResumeCheck({ enabled, onResume: handleResume })

  return null
}
