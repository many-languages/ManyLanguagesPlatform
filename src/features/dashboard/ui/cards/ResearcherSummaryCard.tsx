import StudySummaryCard, { RESEARCHER_STUDY_SUMMARY_LINKS } from "@/src/features/studies"
import type { ResearcherStudyCounts } from "../../queries/getResearcherStudyCounts"

interface ResearcherSummaryCardProps {
  counts: ResearcherStudyCounts
}

export default function ResearcherSummaryCard({ counts }: ResearcherSummaryCardProps) {
  return <StudySummaryCard counts={counts} links={RESEARCHER_STUDY_SUMMARY_LINKS} />
}
