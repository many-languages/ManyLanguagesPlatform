import StudySummaryCard, { ADMIN_STUDY_SUMMARY_LINKS } from "@/src/app/components/StudySummaryCard"
import type { StudySummaryCounts } from "@/src/features/studies/queries/getAdminStudyCounts"

interface AdminSummaryCardProps {
  counts: StudySummaryCounts
}

export default function AdminSummaryCard({ counts }: AdminSummaryCardProps) {
  return <StudySummaryCard counts={counts} links={ADMIN_STUDY_SUMMARY_LINKS} />
}
