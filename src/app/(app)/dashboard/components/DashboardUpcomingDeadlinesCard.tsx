import Link from "next/link"
import Card from "@/src/app/components/Card"
import type { DeadlineStudy, UpcomingDeadlines } from "../queries/getUpcomingDeadlines"

/** Urgency: ≤3 days = error (urgent), ≤7 days = warning (soon), ≤14 days = info (upcoming) */
function getUrgencyClasses(daysOffset: number): string {
  const absDays = Math.abs(daysOffset)
  if (absDays <= 3) return "bg-error/10 border-error/20 text-error-content hover:bg-error/20"
  if (absDays <= 7)
    return "bg-warning/10 border-warning/20 text-warning-content hover:bg-warning/20"
  return "bg-info/10 border-info/20 text-info-content hover:bg-info/20"
}

function formatDateLabel(daysOffset: number, date: Date): string {
  const formatted = date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  })
  if (daysOffset > 0) {
    if (daysOffset === 1) return `${formatted} (tomorrow)`
    if (daysOffset <= 7) return `${formatted} (in ${daysOffset} days)`
    return `${formatted} (in ${daysOffset} days)`
  }
  const abs = Math.abs(daysOffset)
  if (abs === 0) return `${formatted} (today)`
  if (abs === 1) return `${formatted} (yesterday)`
  if (abs <= 7) return `${formatted} (${abs} days ago)`
  return `${formatted} (${abs} days ago)`
}

function DeadlineItem({ study, label }: { study: DeadlineStudy; label: string }) {
  const colorClass = getUrgencyClasses(study.daysOffset)

  return (
    <Link
      href={`/studies/${study.id}`}
      className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${colorClass}`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{study.title}</span>
          {!study.isSetupComplete && (
            <span className="badge badge-warning badge-sm border-warning/50">Setup Incomplete</span>
          )}
        </div>
        <span className="text-xs opacity-80 mt-0.5 block">{label}</span>
      </div>
    </Link>
  )
}

interface DashboardUpcomingDeadlinesCardProps {
  deadlines: UpcomingDeadlines
}

export default function DashboardUpcomingDeadlinesCard({
  deadlines,
}: DashboardUpcomingDeadlinesCardProps) {
  const hasAny =
    deadlines.endingSoon.length > 0 ||
    deadlines.startingSoon.length > 0 ||
    deadlines.recentlyPastEnd.length > 0

  if (!hasAny) {
    return (
      <Card title="Upcoming deadlines" bgColor="bg-base-300">
        <p className="text-sm text-base-content/70">No upcoming deadlines in the next 14 days.</p>
      </Card>
    )
  }

  return (
    <Card title="Upcoming deadlines" bgColor="bg-base-300">
      <div className="flex flex-col gap-4">
        {deadlines.endingSoon.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-base-content/80 mb-2">Ending soon</h3>
            <div className="flex flex-col gap-1">
              {deadlines.endingSoon.map((study) => (
                <DeadlineItem
                  key={study.id}
                  study={study}
                  label={formatDateLabel(study.daysOffset, study.endDate)}
                />
              ))}
            </div>
          </div>
        )}

        {deadlines.startingSoon.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-base-content/80 mb-2">Starting soon</h3>
            <div className="flex flex-col gap-1">
              {deadlines.startingSoon.map((study) => (
                <DeadlineItem
                  key={study.id}
                  study={study}
                  label={formatDateLabel(study.daysOffset, study.startDate)}
                />
              ))}
            </div>
          </div>
        )}

        {deadlines.recentlyPastEnd.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-base-content/80 mb-2">
              Recently past end date
            </h3>
            <div className="flex flex-col gap-1">
              {deadlines.recentlyPastEnd.map((study) => (
                <DeadlineItem
                  key={study.id}
                  study={study}
                  label={formatDateLabel(study.daysOffset, study.endDate)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
