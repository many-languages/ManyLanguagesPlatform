"use client"

import { Alert } from "@/src/app/components/Alert"

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="p-6">
      <Alert variant="error" title="Something went wrong">
        <p>{error.message}</p>
        <button className="btn btn-primary mt-4" onClick={reset}>
          Try again
        </button>
      </Alert>
    </main>
  )
}
