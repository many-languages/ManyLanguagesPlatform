"use client"

import DashboardNotificationsCard from "./DashboardNotificationsCard"
import DashboardResearcherSummaryCard from "./DashboardResearcherSummaryCard"
import DashboardActiveStudiesCard from "./DashboardActiveStudiesCard"
import DashboardUpcomingDeadlinesCard from "./DashboardUpcomingDeadlinesCard"
import DashboardParticipantIncompleteStudiesCard from "./DashboardParticipantIncompleteStudiesCard"
import type { ResearcherStudyCounts } from "../queries/getResearcherStudyCounts"
import type { ActiveStudyWithResponseCount } from "../queries/getActiveStudiesWithResponseCounts"
import type { UpcomingDeadlines } from "../queries/getUpcomingDeadlines"
import type { ParticipantIncompleteStudies } from "../queries/getParticipantIncompleteStudies"

type CurrentUser = {
  id: number
  firstname: string | null
  lastname: string | null
  username: string | null
  email: string
  role: string
  gravatar: string | null
  createdAt: Date
} | null

interface DashboardContentProps {
  currentUser: CurrentUser
  researcherCounts: ResearcherStudyCounts | null
  activeStudiesWithResponses: ActiveStudyWithResponseCount[]
  upcomingDeadlines: UpcomingDeadlines
  participantIncompleteStudies: ParticipantIncompleteStudies
}

export default function DashboardContent({
  currentUser,
  researcherCounts,
  activeStudiesWithResponses,
  upcomingDeadlines,
  participantIncompleteStudies,
}: DashboardContentProps) {
  const isParticipant = currentUser?.role === "PARTICIPANT"

  return (
    <main>
      <h1 className="text-3xl flex justify-center mb-2">
        Welcome{" "}
        {currentUser?.firstname && currentUser?.lastname
          ? `${currentUser.firstname} ${currentUser.lastname}`
          : currentUser?.username || ""}
      </h1>

      <div className="max-w-4xl mx-auto mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        {researcherCounts && <DashboardResearcherSummaryCard counts={researcherCounts} />}
        {activeStudiesWithResponses.length > 0 && (
          <DashboardActiveStudiesCard studies={activeStudiesWithResponses} />
        )}
        {researcherCounts && <DashboardUpcomingDeadlinesCard deadlines={upcomingDeadlines} />}
        {isParticipant && (
          <DashboardParticipantIncompleteStudiesCard studies={participantIncompleteStudies} />
        )}
        <DashboardNotificationsCard />
      </div>
    </main>
  )
}
