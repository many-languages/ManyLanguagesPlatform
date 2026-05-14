"use client"

import SegmentRouteError from "@/src/components/ui/SegmentRouteError"

export default function StudyPageError(props: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="container mx-auto p-4">
      <SegmentRouteError
        {...props}
        logLabel="[Study page error]"
        description="Something went wrong loading this page. Please try again."
      />
    </div>
  )
}
