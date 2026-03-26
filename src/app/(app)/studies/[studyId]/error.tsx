"use client"

import { useEffect } from "react"
import { Alert } from "@/src/app/components/Alert"

export default function StudyPageError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log error to monitoring service
    console.error("Study page error:", error)
  }, [error])

  const showDetail = process.env.NODE_ENV === "development" && Boolean(error.message)

  return (
    <div className="container mx-auto p-4">
      <Alert variant="error">
        <h2 className="font-bold mb-2">Something went wrong</h2>
        <p className="mb-4">
          Something went wrong loading this page. Please try again.
          {showDetail ? (
            <span className="block mt-2 text-sm opacity-80 font-mono">{error.message}</span>
          ) : null}
        </p>
        <button type="button" onClick={reset} className="btn btn-primary">
          Try again
        </button>
      </Alert>
    </div>
  )
}
