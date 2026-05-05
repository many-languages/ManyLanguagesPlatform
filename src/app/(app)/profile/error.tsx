"use client"

import { Alert } from "@/src/components/ui/Alert"
import { AsyncButton } from "@/src/components/ui/AsyncButton"
import Link from "next/link"

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="p-6">
      <Alert variant="error" title="Something went wrong">
        <p>{error.message}</p>
        <div className="flex gap-2 mt-4">
          <AsyncButton onClick={reset} className="btn btn-primary">
            Try again
          </AsyncButton>
          <Link href="/dashboard" className="btn btn-ghost">
            Back to Dashboard
          </Link>
        </div>
      </Alert>
    </main>
  )
}
