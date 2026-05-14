"use client"

import Link from "next/link"
import SegmentRouteError from "@/src/components/ui/SegmentRouteError"

export default function Error(props: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto mt-10 max-w-4xl">
      <div className="card bg-base-200 p-6 shadow-md">
        <SegmentRouteError
          {...props}
          logLabel="[Study setup error]"
          description="Something went wrong in study setup. Please try again."
          extraActions={
            <Link href="/studies" className="btn btn-ghost">
              Back to Studies
            </Link>
          }
        />
      </div>
    </div>
  )
}
