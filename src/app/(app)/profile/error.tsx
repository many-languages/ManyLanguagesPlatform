"use client"

import Link from "next/link"
import SegmentRouteError from "@/src/components/ui/SegmentRouteError"

export default function Error(props: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="p-6">
      <SegmentRouteError
        {...props}
        logLabel="[Profile error]"
        extraActions={
          <Link href="/dashboard" className="btn btn-ghost">
            Back to Dashboard
          </Link>
        }
      />
    </main>
  )
}
