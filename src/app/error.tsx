"use client" // Error components must be Client components
import React, { useEffect } from "react"
import { Alert } from "./components/Alert"

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <Alert variant="error">
        <span>Something went wrong!</span>
      </Alert>
      <div className="flex gap-2">
        <button className="btn btn-error" onClick={() => reset()}>
          Try again
        </button>
        <a href="/" className="btn btn-outline">
          Go Home
        </a>
      </div>
    </div>
  )
}
