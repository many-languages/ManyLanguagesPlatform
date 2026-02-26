import Link from "next/link"
import {
  BanknotesIcon,
  CheckCircleIcon,
  CalendarDaysIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline"
import Card from "@/src/app/components/Card"
import type { ParticipantCompletedNotPaidStudy } from "../queries/getParticipantCompletedNotPaidStudies"

function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  })
}

function StudyItem({ study }: { study: ParticipantCompletedNotPaidStudy }) {
  return (
    <Link
      href={`/studies/${study.id}`}
      className="group flex items-start gap-4 p-4 rounded-xl border border-base-300 bg-base-200/50 hover:bg-success/10 hover:border-success/30 transition-all duration-200 shadow-sm hover:shadow-md"
    >
      <div className="flex-1 min-w-0">
        <span className="font-semibold text-base truncate block text-base-content group-hover:text-success">
          {study.title}
        </span>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-base-content/70">
          <span className="flex items-center gap-1.5">
            <BanknotesIcon className="h-4 w-4 shrink-0 text-base-content" />
            {study.payment}
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircleIcon className="h-4 w-4 shrink-0 text-base-content" />
            Completed {formatDate(study.completedAt)}
          </span>
          <span className="flex items-center gap-1.5">
            <CalendarDaysIcon className="h-4 w-4 shrink-0 text-base-content" />
            Study ended {formatDate(study.endDate)}
          </span>
        </div>
      </div>
      <ChevronRightIcon className="h-5 w-5 shrink-0 text-base-content group-hover:text-success group-hover:translate-x-0.5 transition-all" />
    </Link>
  )
}

interface DashboardParticipantCompletedNotPaidCardProps {
  studies: ParticipantCompletedNotPaidStudy[]
}

export default function DashboardParticipantCompletedNotPaidCard({
  studies,
}: DashboardParticipantCompletedNotPaidCardProps) {
  if (studies.length === 0) {
    return (
      <Card title="Awaiting payment" bgColor="bg-base-300">
        <p className="text-sm text-base-content/70">No completed studies awaiting payment.</p>
      </Card>
    )
  }

  return (
    <Card title="Awaiting payment" bgColor="bg-base-300">
      <div className="flex flex-col gap-3">
        {studies.map((study) => (
          <StudyItem key={study.id} study={study} />
        ))}
      </div>
    </Card>
  )
}
