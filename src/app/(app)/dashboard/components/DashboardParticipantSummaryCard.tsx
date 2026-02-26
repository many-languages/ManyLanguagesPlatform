import Link from "next/link"
import {
  RectangleStackIcon,
  ClockIcon,
  BanknotesIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline"
import Card from "@/src/app/components/Card"
import type { ParticipantStudyCounts } from "../queries/getParticipantStudyCounts"

interface StatItemProps {
  href: string
  icon: React.ReactNode
  label: string
  count: number
}

function StatItem({ href, icon, label, count }: StatItemProps) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 p-3 rounded-lg hover:bg-base-300 transition-colors"
    >
      <span className="text-base-content/70">{icon}</span>
      <span className="flex-1 text-sm">{label}</span>
      <span className="badge badge-primary badge-lg">{count}</span>
    </Link>
  )
}

interface DashboardParticipantSummaryCardProps {
  counts: ParticipantStudyCounts
}

export default function DashboardParticipantSummaryCard({
  counts,
}: DashboardParticipantSummaryCardProps) {
  return (
    <Card title="Study summary" bgColor="bg-base-300">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <StatItem
          href="/studies"
          icon={<RectangleStackIcon className="h-6 w-6" />}
          label="All studies"
          count={counts.all}
        />
        <StatItem
          href="/studies?view=not_completed"
          icon={<ClockIcon className="h-6 w-6" />}
          label="Not completed"
          count={counts.notCompleted}
        />
        <StatItem
          href="/studies?view=completed_not_paid"
          icon={<BanknotesIcon className="h-6 w-6" />}
          label="Not paid (completed)"
          count={counts.completedNotPaid}
        />
        <StatItem
          href="/explore"
          icon={<MagnifyingGlassIcon className="h-6 w-6" />}
          label="To explore"
          count={counts.toExplore}
        />
      </div>
    </Card>
  )
}
