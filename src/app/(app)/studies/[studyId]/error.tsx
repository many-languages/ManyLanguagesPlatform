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

  return (
    <div className="container mx-auto p-4">
      <Alert variant="error">
        <h2 className="font-bold mb-2">Something went wrong!</h2>
        <p className="mb-4">{error.message || "An unexpected error occurred"}</p>
        <button onClick={reset} className="btn btn-primary">
          Try again
        </button>
      </Alert>
    </div>
  )
}
