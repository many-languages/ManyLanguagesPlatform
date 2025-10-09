"use client"

import { useState } from "react"

interface RunStudyButtonProps {
  runUrl: string | null
  isActive?: boolean
}

export default function RunStudyButton({ runUrl, isActive = true }: RunStudyButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleRunStudy = () => {
    if (!runUrl || !isActive) return
    setLoading(true)
    try {
      // open JATOS run link in new tab
      window.open(runUrl, "_blank", "noopener,noreferrer")
    } finally {
      setLoading(false)
    }
  }

  if (!runUrl) {
    return (
      <button className="btn btn-disabled mt-4" disabled>
        No study link available
      </button>
    )
  }

  const disabled = loading || !isActive
  const tooltipText = !isActive
    ? "You cannot currently participate. Please contact the researcher if this is a mistake or you have any questions."
    : undefined

  return (
    <div className="tooltip tooltip-bottom" data-tip={tooltipText}>
      <button
        className={`btn btn-primary mt-4 ${loading ? "loading" : ""}`}
        onClick={handleRunStudy}
        disabled={disabled}
      >
        {loading ? "Starting..." : "Run Study"}
      </button>
    </div>
  )
}
