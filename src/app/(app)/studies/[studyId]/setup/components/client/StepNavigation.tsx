"use client"

import { useRouter } from "next/navigation"
import { useStudySetup } from "./StudySetupProvider"
import type { Route } from "next"

interface StepNavigationProps {
  prev?: string // e.g., "step2"
  next?: string // e.g., "step4" or "study" for final step
  disableNext?: boolean
  prevLabel?: string
  nextLabel?: string
  onNext?: () => void | Promise<void> // Custom next handler
  nextTooltip?: string // Tooltip message when Next button is disabled
}

export default function StepNavigation({
  prev,
  next,
  disableNext,
  prevLabel = "Back",
  nextLabel = "Next",
  onNext,
  nextTooltip,
}: StepNavigationProps) {
  const { studyId } = useStudySetup()
  const router = useRouter()

  const handleNav = (step: string | undefined) => {
    if (!studyId || !step) return

    // Handle special case for final step navigation to study page
    if (step === "study") {
      router.push(`/studies/${studyId}` as Route)
    } else {
      router.push(`/studies/${studyId}/setup/${step}` as Route)
    }
  }

  return (
    <div className="flex justify-between items-center mt-6">
      {prev ? (
        <button className="btn btn-secondary" onClick={() => handleNav(prev)}>
          {prevLabel}
        </button>
      ) : (
        <div /> // placeholder keeps spacing consistent
      )}

      {next ? (
        <div
          className="tooltip tooltip-top"
          data-tip={disableNext && nextTooltip ? nextTooltip : undefined}
        >
          <button
            className={`btn btn-primary ${disableNext ? "btn-disabled" : ""}`}
            onClick={async () => {
              if (disableNext) return
              if (onNext) {
                await onNext()
              } else {
                handleNav(next)
              }
            }}
            disabled={disableNext}
          >
            {nextLabel}
          </button>
        </div>
      ) : (
        <div />
      )}
    </div>
  )
}
