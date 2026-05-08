"use client"

import NotificationsCard from "./cards/NotificationsCard"
import ResearcherSummaryCard from "./cards/ResearcherSummaryCard"
import ActiveStudiesCard from "./cards/ActiveStudiesCard"
import UpcomingDeadlinesCard from "./cards/UpcomingDeadlinesCard"
import ParticipantIncompleteStudiesCard from "./cards/ParticipantIncompleteStudiesCard"
import ParticipantSummaryCard from "./cards/ParticipantSummaryCard"
import ParticipantCompletedNotPaidCard from "./cards/ParticipantCompletedNotPaidCard"
import type { ResearcherStudyCounts } from "../queries/getResearcherStudyCounts"
import type { ParticipantStudyCounts } from "../queries/getParticipantStudyCounts"
import type { ActiveStudyWithResponseCount } from "../queries/getActiveStudiesWithResponseCounts"
import type { UpcomingDeadlines } from "../queries/getUpcomingDeadlines"
import type { ParticipantIncompleteStudies } from "../queries/getParticipantIncompleteStudies"
import type { ParticipantCompletedNotPaidStudy } from "../queries/getParticipantCompletedNotPaidStudies"
import type { DashboardCurrentUser } from "../types"

interface PortalDashboardProps {
  currentUser: DashboardCurrentUser
  researcherCounts: ResearcherStudyCounts | null
  activeStudiesWithResponses: ActiveStudyWithResponseCount[]
  upcomingDeadlines: UpcomingDeadlines
  participantIncompleteStudies: ParticipantIncompleteStudies
  participantCounts: ParticipantStudyCounts | null
  participantCompletedNotPaid: ParticipantCompletedNotPaidStudy[]
}

export default function PortalDashboard({
  currentUser,
  researcherCounts,
  activeStudiesWithResponses,
  upcomingDeadlines,
  participantIncompleteStudies,
  participantCounts,
  participantCompletedNotPaid,
}: PortalDashboardProps) {
  const isParticipant = currentUser?.role === "PARTICIPANT"

  return (
    <main>
      <div className="max-w-6xl mx-auto mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        {researcherCounts && <ResearcherSummaryCard counts={researcherCounts} />}
        {participantCounts && <ParticipantSummaryCard counts={participantCounts} />}
        {activeStudiesWithResponses.length > 0 && (
          <ActiveStudiesCard studies={activeStudiesWithResponses} />
        )}
        {researcherCounts && <UpcomingDeadlinesCard deadlines={upcomingDeadlines} />}
        {isParticipant && (
          <ParticipantIncompleteStudiesCard studies={participantIncompleteStudies} />
        )}
        {isParticipant && <ParticipantCompletedNotPaidCard studies={participantCompletedNotPaid} />}
        <NotificationsCard variant="portal" />
      </div>
    </main>
  )
}
