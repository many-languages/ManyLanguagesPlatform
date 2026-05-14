"use client"

import SegmentRouteError from "@/src/components/ui/SegmentRouteError"

export default function Error(props: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="p-6">
      <SegmentRouteError {...props} logLabel="[Explore error]" />
    </main>
  )
}
