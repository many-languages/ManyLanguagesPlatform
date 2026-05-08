import {
  StudySummaryCard,
  ADMIN_STUDY_SUMMARY_LINKS,
  type StudySummaryCounts,
} from "@/src/features/studies"

interface AdminSummaryCardProps {
  counts: StudySummaryCounts
}

export default function AdminSummaryCard({ counts }: AdminSummaryCardProps) {
  return <StudySummaryCard counts={counts} links={ADMIN_STUDY_SUMMARY_LINKS} />
}
