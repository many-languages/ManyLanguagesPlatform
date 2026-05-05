"use client"

import { Alert } from "@/src/components/ui/Alert"
import { AsyncButton } from "@/src/components/ui/AsyncButton"
import Link from "next/link"

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="max-w-4xl mx-auto mt-10">
      <div className="card bg-base-200 p-6 shadow-md">
        <Alert variant="error" title="Something went wrong">
          <p>{error.message}</p>
          <div className="flex gap-2 mt-4">
            <AsyncButton onClick={reset} className="btn btn-primary">
              Try again
            </AsyncButton>
            <Link href="/studies" className="btn btn-ghost">
              Back to Studies
            </Link>
          </div>
        </Alert>
      </div>
    </div>
  )
}
