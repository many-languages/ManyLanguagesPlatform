"use client"

import { Alert } from "@/src/app/components/Alert"
import { AsyncButton } from "@/src/app/components/AsyncButton"
import Link from "next/link"

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md px-6 flex flex-col items-center gap-2">
        <Alert variant="error" title="Something went wrong">
          <p>{error.message}</p>
          <div className="flex gap-2 mt-4">
            <AsyncButton onClick={reset} className="btn btn-primary">
              Try again
            </AsyncButton>
            <Link href="/login" className="btn btn-ghost">
              Back to Login
            </Link>
          </div>
        </Alert>
      </div>
    </main>
  )
}
