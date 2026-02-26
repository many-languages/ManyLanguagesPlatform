import Link from "next/link"
import Card from "@/src/app/components/Card"
import type {
  ParticipantIncompleteStudy,
  ParticipantIncompleteStudies,
} from "../queries/getParticipantIncompleteStudies"

/** Urgency for nearing: ≤3 days = error, ≤7 days = warning, else info */
function getNearingUrgencyClasses(daysUntilDeadline: number): string {
  if (daysUntilDeadline <= 3)
    return "bg-error/10 border-error/20 text-error-content hover:bg-error/20"
  if (daysUntilDeadline <= 7)
    return "bg-warning/10 border-warning/20 text-warning-content hover:bg-warning/20"
  return "bg-info/10 border-info/20 text-info-content hover:bg-info/20"
}

function formatDateLabel(daysUntilDeadline: number, date: Date): string {
  const formatted = date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  })
  if (daysUntilDeadline > 0) {
    if (daysUntilDeadline === 1) return `${formatted} (tomorrow)`
    return `${formatted} (in ${daysUntilDeadline} days)`
  }
  const abs = Math.abs(daysUntilDeadline)
  if (abs === 0) return `${formatted} (today)`
  if (abs === 1) return `${formatted} (yesterday)`
  return `${formatted} (${abs} days ago)`
}

function StudyItem({
  study,
  label,
  isPastDeadline,
}: {
  study: ParticipantIncompleteStudy
  label: string
  isPastDeadline: boolean
}) {
  const colorClass = isPastDeadline
    ? "bg-base-200 border-base-300 opacity-80 hover:opacity-100"
    : getNearingUrgencyClasses(study.daysUntilDeadline)

  return (
    <Link
      href={`/studies/${study.id}`}
      className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${colorClass}`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm truncate">{study.title}</span>
          {study.completionStatus === "unknown" && (
            <span className="badge badge-ghost badge-sm">Status unknown</span>
          )}
          {isPastDeadline && (
            <span className="badge badge-error badge-sm">No longer available</span>
          )}
        </div>
        <span className="text-xs opacity-80 mt-0.5 block">{label}</span>
      </div>
    </Link>
  )
}

interface DashboardParticipantIncompleteStudiesCardProps {
  studies: ParticipantIncompleteStudies
}

export default function DashboardParticipantIncompleteStudiesCard({
  studies,
}: DashboardParticipantIncompleteStudiesCardProps) {
  const hasAny = studies.nearingDeadline.length > 0 || studies.passedDeadline.length > 0

  if (!hasAny) {
    return (
      <Card title="Studies to complete" bgColor="bg-base-300">
        <p className="text-sm text-base-content/70">
          No incomplete studies. You are all caught up!
        </p>
      </Card>
    )
  }

  return (
    <Card title="Studies to complete" bgColor="bg-base-300">
      <div className="flex flex-col gap-4">
        {studies.nearingDeadline.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-base-content/80 mb-2">Nearing deadline</h3>
            <div className="flex flex-col gap-1">
              {studies.nearingDeadline.map((study) => (
                <StudyItem
                  key={study.id}
                  study={study}
                  label={formatDateLabel(study.daysUntilDeadline, study.endDate)}
                  isPastDeadline={false}
                />
              ))}
            </div>
          </div>
        )}

        {studies.passedDeadline.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-base-content/80 mb-2">Passed deadline</h3>
            <p className="text-xs text-base-content/60 mb-2">
              You can no longer participate in these studies.
            </p>
            <div className="flex flex-col gap-1">
              {studies.passedDeadline.map((study) => (
                <StudyItem
                  key={study.id}
                  study={study}
                  label={formatDateLabel(study.daysUntilDeadline, study.endDate)}
                  isPastDeadline={true}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
