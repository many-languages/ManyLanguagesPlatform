"use client"

import Link from "next/link"
import SegmentRouteError from "@/src/components/ui/SegmentRouteError"

export default function Error(props: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="flex w-full max-w-md flex-col items-center gap-2 px-6">
        <SegmentRouteError
          {...props}
          logLabel="[Auth error]"
          extraActions={
            <Link href="/login" className="btn btn-ghost">
              Back to Login
            </Link>
          }
        />
      </div>
    </main>
  )
}
