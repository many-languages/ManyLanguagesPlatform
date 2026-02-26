import Link from "next/link"
import type { Route } from "next"
import {
  RectangleStackIcon,
  SignalIcon,
  ArchiveBoxIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/24/outline"
import Card from "@/src/app/components/Card"
import type { ResearcherStudyCounts } from "../queries/getResearcherStudyCounts"

interface StatItemProps {
  href: string
  icon: React.ReactNode
  label: string
  count: number
}

function StatItem({ href, icon, label, count }: StatItemProps) {
  return (
    <Link
      href={href as Route}
      className="flex items-center gap-3 p-3 rounded-lg hover:bg-base-300 transition-colors"
    >
      <span className="text-base-content/70">{icon}</span>
      <span className="flex-1 text-sm">{label}</span>
      <span className="badge badge-primary badge-lg">{count}</span>
    </Link>
  )
}

interface DashboardResearcherSummaryCardProps {
  counts: ResearcherStudyCounts
}

export default function DashboardResearcherSummaryCard({
  counts,
}: DashboardResearcherSummaryCardProps) {
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
          href="/studies?view=active"
          icon={<SignalIcon className="h-6 w-6" />}
          label="Active"
          count={counts.active}
        />
        <StatItem
          href="/studies?view=archived"
          icon={<ArchiveBoxIcon className="h-6 w-6" />}
          label="Archived"
          count={counts.archived}
        />
        <StatItem
          href="/studies?view=incomplete"
          icon={<WrenchScrewdriverIcon className="h-6 w-6" />}
          label="Setup incomplete"
          count={counts.setupIncomplete}
        />
      </div>
    </Card>
  )
}
