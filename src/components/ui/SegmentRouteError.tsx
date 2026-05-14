"use client"

import { useEffect, type ReactNode } from "react"
import { Alert } from "@/src/components/ui/Alert"

const DEFAULT_DESCRIPTION = "Something went wrong loading this page. Please try again."

export interface SegmentRouteErrorProps {
  error: Error & { digest?: string }
  reset: () => void
  /** Passed to `console.error` for correlation (e.g. `"[Dashboard]"`). */
  logLabel: string
  /** Production-safe explanation under the title. */
  description?: string
  /** e.g. `<Link href="..." className="btn btn-ghost">…</Link>` */
  extraActions?: ReactNode
}

/**
 * Shared App Router segment `error.tsx` UI: generic copy in production, optional
 * `error.message` in development only, and `useEffect` logging.
 */
export default function SegmentRouteError({
  error,
  reset,
  logLabel,
  description = DEFAULT_DESCRIPTION,
  extraActions,
}: SegmentRouteErrorProps) {
  useEffect(() => {
    console.error(logLabel, error)
  }, [error, logLabel])

  const showDetail = process.env.NODE_ENV === "development" && Boolean(error.message)

  return (
    <Alert variant="error" title="Something went wrong">
      <p>
        {description}
        {showDetail ? (
          <span className="mt-2 block break-all font-mono text-sm opacity-80">{error.message}</span>
        ) : null}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className="btn btn-primary" onClick={() => reset()}>
          Try again
        </button>
        {extraActions}
      </div>
    </Alert>
  )
}
