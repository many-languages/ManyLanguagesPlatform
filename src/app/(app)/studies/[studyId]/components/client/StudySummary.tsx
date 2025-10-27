"use client"

import { useMemo } from "react"
import type { JatosMetadata } from "@/src/types/jatos"
import { formatDuration } from "@/src/lib/utils/formatDuration"
import { formatBytes } from "@/src/lib/utils/formatBytes"
import { parseDuration } from "@/src/lib/utils/parseDuration"

interface StudySummaryProps {
  metadata: JatosMetadata
}

export default function StudySummary({ metadata }: StudySummaryProps) {
  const summary = useMemo(() => {
    const study = metadata?.data?.[0]
    const studyResults = study?.studyResults ?? []

    if (!studyResults.length) return null

    // 1️⃣ Finished / not finished participants
    const finished = studyResults.filter((r) => r.studyState === "FINISHED").length
    const notFinished = studyResults.length - finished

    // 2️⃣ Unique component count
    const allComponents = studyResults.flatMap((r) => r.componentResults || [])
    const numComponents = new Set(allComponents.map((c) => c.componentId)).size

    // 3️⃣ Average duration (in seconds)
    const durations = allComponents.map((c) => parseDuration(c.duration)).filter((n) => !isNaN(n))
    const avgDurationSec =
      durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0

    // 4️⃣ Average data size (bytes)
    const sizes = allComponents.map((c) => c.data?.size ?? 0)
    const avgDataSize = sizes.length > 0 ? sizes.reduce((a, b) => a + b, 0) / sizes.length : 0

    // 5️⃣ Latest lastSeenDate (epoch ms)
    const lastSeenDates = studyResults.map((r) => r.lastSeenDate ?? 0)
    const latestLastSeen = Math.max(...lastSeenDates)
    const latestLastSeenStr = latestLastSeen > 0 ? new Date(latestLastSeen).toLocaleString() : "N/A"

    return {
      finished,
      notFinished,
      numComponents,
      avgDurationSec,
      avgDataSize,
      latestLastSeenStr,
    }
  }, [metadata])

  if (!summary) return null

  return (
    <div className="stats shadow bg-base-200 mt-6 w-full">
      <div className="stat">
        <div className="stat-title">Participants (Finished)</div>
        <div className="stat-value text-success">{summary.finished}</div>
        <div className="stat-desc text-error">Not finished: {summary.notFinished}</div>
      </div>

      <div className="stat">
        <div className="stat-title">Components</div>
        <div className="stat-value">{summary.numComponents}</div>
        <div className="stat-desc">Unique component IDs</div>
      </div>

      <div className="stat">
        <div className="stat-title">Avg. Duration</div>
        <div className="stat-value text-primary">{formatDuration(summary.avgDurationSec)}</div>
        <div className="stat-desc">Across all components</div>
      </div>

      <div className="stat">
        <div className="stat-title">Avg. Data Size</div>
        <div className="stat-value text-secondary">{formatBytes(summary.avgDataSize)}</div>
        <div className="stat-desc">Across components</div>
      </div>

      <div className="stat">
        <div className="stat-title">Latest Response</div>
        <div className="stat-value text-accent">{summary.latestLastSeenStr}</div>
        <div className="stat-desc">Most recent lastSeenDate</div>
      </div>
    </div>
  )
}
