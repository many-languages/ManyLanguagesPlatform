"use client"

import { NavigationButton } from "@/src/app/components/NavigationButton"
import { AsyncButton } from "@/src/app/components/AsyncButton"
import type { Route } from "next"

interface StepNavigationProps {
  studyId: number
  prev?: string // e.g., "step2"
  next?: string // e.g., "step4" or "study" for final step
  disableNext?: boolean
  prevLabel?: string
  nextLabel?: string
  onNext?: () => void | Promise<void> // Custom next handler
  nextTooltip?: string // Tooltip message when Next button is disabled
}

export default function StepNavigation({
  studyId,
  prev,
  next,
  disableNext,
  prevLabel = "Back",
  nextLabel = "Next",
  onNext,
  nextTooltip,
}: StepNavigationProps) {
  // const { studyId } = useStudySetup() // Removed context

  const getHref = (step: string): Route => {
    // Handle special case for final step navigation to study page
    if (step === "study") {
      return `/studies/${studyId}` as Route
    }
    return `/studies/${studyId}/setup/${step}` as Route
  }

  return (
    <div className="flex justify-between items-center mt-6">
      {prev ? (
        <NavigationButton href={getHref(prev)} className="btn btn-secondary">
          {prevLabel}
        </NavigationButton>
      ) : (
        <div /> // placeholder keeps spacing consistent
      )}

      {next ? (
        <div
          className="tooltip tooltip-top"
          data-tip={disableNext && nextTooltip ? nextTooltip : undefined}
        >
          {onNext ? (
            <AsyncButton
              onClick={async () => {
                if (disableNext) return
                await onNext()
              }}
              loadingText={nextLabel}
              disabled={disableNext}
              className={`btn btn-primary ${disableNext ? "btn-disabled" : ""}`}
            >
              {nextLabel}
            </AsyncButton>
          ) : (
            <NavigationButton
              href={getHref(next)}
              className={`btn btn-primary ${disableNext ? "btn-disabled" : ""}`}
              disabled={disableNext}
            >
              {nextLabel}
            </NavigationButton>
          )}
        </div>
      ) : (
        <div />
      )}
    </div>
  )
}
