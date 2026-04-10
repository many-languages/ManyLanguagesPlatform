import StudySummaryCard, {
  RESEARCHER_STUDY_SUMMARY_LINKS,
} from "@/src/app/components/StudySummaryCard"
import type { ResearcherStudyCounts } from "../queries/getResearcherStudyCounts"

interface DashboardResearcherSummaryCardProps {
  counts: ResearcherStudyCounts
}

export default function DashboardResearcherSummaryCard({
  counts,
}: DashboardResearcherSummaryCardProps) {
  return <StudySummaryCard counts={counts} links={RESEARCHER_STUDY_SUMMARY_LINKS} />
}
