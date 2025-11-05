import type { JatosMetadata } from "@/src/types/jatos"
import { formatDuration } from "@/src/lib/utils/formatDuration"
import { formatBytes } from "@/src/lib/utils/formatBytes"
import { calculateStudySummary } from "../utils/calculateStudySummary"
import { EmptyState } from "@/src/app/components/EmptyState"
import { Alert } from "@/src/app/components/Alert"

interface StudySummaryProps {
  metadata: JatosMetadata
}

export default function StudySummary({ metadata }: StudySummaryProps) {
  try {
    const summary = calculateStudySummary(metadata)

    if (!summary) {
      return (
        <div className="mt-6">
          <EmptyState
            message="No study results available yet. Summary statistics will appear once participants start completing the study."
            title="No Results"
            className="bg-base-200 rounded-lg p-6"
          />
        </div>
      )
    }

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
  } catch (error) {
    console.error("Error calculating study summary:", error)

    return (
      <Alert variant="error" className="mt-6">
        <p>
          Unable to calculate study summary statistics. This may be due to unexpected data format.
        </p>
        {error instanceof Error && <p className="text-sm mt-2 opacity-75">{error.message}</p>}
      </Alert>
    )
  }
}
