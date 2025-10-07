"use client"

import { useState } from "react"

interface RunStudyButtonProps {
  runUrl: string | null
}

export default function RunStudyButton({ runUrl }: RunStudyButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleRunStudy = () => {
    if (!runUrl) return
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

  return (
    <button
      className={`btn btn-primary mt-4 ${loading ? "loading" : ""}`}
      onClick={handleRunStudy}
      disabled={loading}
    >
      {loading ? "Starting..." : "Run Study"}
    </button>
  )
}
