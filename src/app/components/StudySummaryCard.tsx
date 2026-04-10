import type { ReactNode } from "react"
import Link from "next/link"
import type { Route } from "next"
import {
  RectangleStackIcon,
  SignalIcon,
  ArchiveBoxIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/24/outline"
import Card from "@/src/app/components/Card"
import type { StudySummaryCounts } from "@/src/lib/studies/studySummaryCounts"

export type StudySummaryLinks = {
  all: string
  active: string
  archived: string
  setupIncomplete: string
}

export const RESEARCHER_STUDY_SUMMARY_LINKS: StudySummaryLinks = {
  all: "/studies",
  active: "/studies?view=active",
  archived: "/studies?view=archived",
  setupIncomplete: "/studies?view=incomplete",
}

/** All rows link to the studies table; no query presets (counts remain informational). */
export const ADMIN_STUDY_SUMMARY_LINKS: StudySummaryLinks = {
  all: "/admin/studies",
  active: "/admin/studies",
  archived: "/admin/studies",
  setupIncomplete: "/admin/studies",
}

interface StatItemProps {
  href: string
  icon: ReactNode
  label: string
  count: number
}

function StatItem({ href, icon, label, count }: StatItemProps) {
  return (
    <Link
      href={href as Route}
      className={[
        "flex w-full items-center gap-3 rounded-lg border border-transparent p-3",
        "text-left font-normal no-underline transition-all duration-150",
        "hover:border-primary/45 hover:bg-primary/10 hover:shadow-md",
        "active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
      ].join(" ")}
    >
      <span className="text-base-content/70 shrink-0">{icon}</span>
      <span className="flex-1 text-sm">{label}</span>
      <span className="badge badge-primary badge-lg shrink-0">{count}</span>
    </Link>
  )
}

interface StudySummaryCardProps {
  counts: StudySummaryCounts
  links: StudySummaryLinks
}

export default function StudySummaryCard({ counts, links }: StudySummaryCardProps) {
  return (
    <Card title="Study summary" bgColor="bg-base-300">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <StatItem
          href={links.all}
          icon={<RectangleStackIcon className="h-6 w-6" />}
          label="All studies"
          count={counts.all}
        />
        <StatItem
          href={links.active}
          icon={<SignalIcon className="h-6 w-6" />}
          label="Active"
          count={counts.active}
        />
        <StatItem
          href={links.archived}
          icon={<ArchiveBoxIcon className="h-6 w-6" />}
          label="Archived"
          count={counts.archived}
        />
        <StatItem
          href={links.setupIncomplete}
          icon={<WrenchScrewdriverIcon className="h-6 w-6" />}
          label="Setup incomplete"
          count={counts.setupIncomplete}
        />
      </div>
    </Card>
  )
}
