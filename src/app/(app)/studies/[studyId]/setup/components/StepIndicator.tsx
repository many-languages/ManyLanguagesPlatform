"use client"

import { usePathname } from "next/navigation"
import clsx from "clsx"

interface StepIndicatorProps {
  completedSteps: number[]
  onClickStep?: (stepId: number) => void
  editable?: boolean
}

const steps = [
  { id: 1, name: "General info", path: "step1" },
  { id: 2, name: "JATOS setup", path: "step2" },
  { id: 3, name: "Test run", path: "step3" },
  { id: 4, name: "Feedback", path: "step4" },
]

export default function StepIndicator({
  completedSteps,
  onClickStep,
  editable = false,
}: StepIndicatorProps) {
  const pathname = usePathname()

  // Auto-detect current step from pathname
  const step = steps.find((s) => pathname.endsWith(s.path))
  const currentStep = step ? step.id : 1 // Default to step 1 if no match

  return (
    <ul className="steps mb-8 w-full">
      {steps.map((s) => {
        const isCompleted = completedSteps.includes(s.id)
        const isCurrent = currentStep === s.id
        const isUpToCurrent = s.id <= currentStep // Steps up to and including current
        // Only completed steps are clickable when editable
        const isClickable = editable && onClickStep && isCompleted

        return (
          <li
            key={s.id}
            className={clsx(
              "step",
              (isCompleted || isUpToCurrent) && "step-primary", // Color completed steps OR steps up to current (for edge coloring)
              isCurrent && "step-info", // Highlight current step (overrides primary on node but edges remain colored)
              isClickable && "cursor-pointer hover:opacity-80",
              editable && !isCompleted && "opacity-50 cursor-not-allowed"
            )}
            onClick={isClickable ? () => onClickStep(s.id) : undefined}
            title={
              editable && !isCompleted
                ? "Complete this step first"
                : isCompleted && editable
                ? "Click to edit"
                : undefined
            }
          >
            {s.name}
            {isCompleted && editable && (
              <span className="text-xs text-base-content/70">(editable)</span>
            )}
          </li>
        )
      })}
    </ul>
  )
}
