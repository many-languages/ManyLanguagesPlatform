"use client"

import { useEffect } from "react"

interface UseWindowResumeCheckOptions {
  enabled?: boolean
  onResume: () => void | Promise<void>
  includeVisibilityChange?: boolean
}

/**
 * Registers focus and optional visibility listeners that invoke the supplied
 * callback whenever the window regains focus or becomes visible again.
 */
export function useWindowResumeCheck({
  enabled = true,
  onResume,
  includeVisibilityChange = true,
}: UseWindowResumeCheckOptions) {
  useEffect(() => {
    if (!enabled) return

    const handleFocus = () => {
      void onResume()
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void onResume()
      }
    }

    window.addEventListener("focus", handleFocus)

    if (includeVisibilityChange) {
      document.addEventListener("visibilitychange", handleVisibilityChange)
    }

    return () => {
      window.removeEventListener("focus", handleFocus)

      if (includeVisibilityChange) {
        document.removeEventListener("visibilitychange", handleVisibilityChange)
      }
    }
  }, [enabled, includeVisibilityChange, onResume])
}
