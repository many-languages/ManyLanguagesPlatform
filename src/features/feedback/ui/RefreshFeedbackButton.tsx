"use client"

import { ArrowPathIcon } from "@heroicons/react/24/outline"
import { AsyncButton } from "@/src/app/components/AsyncButton"

interface RefreshFeedbackButtonProps {
  onRefresh?: () => Promise<void> | void
}

export default function RefreshFeedbackButton({ onRefresh }: RefreshFeedbackButtonProps) {
  return (
    <AsyncButton
      onClick={async () => {
        if (onRefresh) {
          const result = onRefresh()
          if (result instanceof Promise) {
            await result
          }
        }
      }}
      loadingText="Refreshing"
      className="btn btn-secondary"
    >
      <span className="flex items-center gap-2">
        <ArrowPathIcon className="h-4 w-4" />
        Refresh Feedback
      </span>
    </AsyncButton>
  )
}
