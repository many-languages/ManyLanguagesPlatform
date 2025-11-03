"use client"

import { AsyncButton } from "@/src/app/components/AsyncButton"

interface RunStudyButtonProps {
  runUrl: string | null
  isActive?: boolean
}

export default function RunStudyButton({ runUrl, isActive = true }: RunStudyButtonProps) {
  const handleRunStudy = () => {
    if (!runUrl || !isActive) return
    // open JATOS run link in new tab
    window.open(runUrl, "_blank", "noopener,noreferrer")
  }

  if (!runUrl) {
    return (
      <button className="btn btn-disabled mt-4" disabled>
        No study link available
      </button>
    )
  }

  const tooltipText = !isActive
    ? "You cannot currently participate. Please contact the researcher if this is a mistake or you have any questions."
    : undefined

  return (
    <div className="tooltip tooltip-bottom" data-tip={tooltipText}>
      <AsyncButton
        onClick={handleRunStudy}
        loadingText="Starting..."
        disabled={!isActive}
        className="btn btn-primary mt-4"
      >
        Run Study
      </AsyncButton>
    </div>
  )
}
