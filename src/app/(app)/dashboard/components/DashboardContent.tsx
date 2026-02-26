"use client"

import DashboardNotificationsCard from "./DashboardNotificationsCard"
import DashboardResearcherSummaryCard from "./DashboardResearcherSummaryCard"
import DashboardActiveStudiesCard from "@/src/app/(app)/dashboard/components/DashboardActiveStudiesCard"
import DashboardUpcomingDeadlinesCard from "./DashboardUpcomingDeadlinesCard"
import DashboardParticipantIncompleteStudiesCard from "./DashboardParticipantIncompleteStudiesCard"
import DashboardParticipantSummaryCard from "./DashboardParticipantSummaryCard"
import DashboardParticipantCompletedNotPaidCard from "./DashboardParticipantCompletedNotPaidCard"
import type { ResearcherStudyCounts } from "../queries/getResearcherStudyCounts"
import type { ParticipantStudyCounts } from "../queries/getParticipantStudyCounts"
import type { ActiveStudyWithResponseCount } from "../queries/getActiveStudiesWithResponseCounts"
import type { UpcomingDeadlines } from "../queries/getUpcomingDeadlines"
import type { ParticipantIncompleteStudies } from "../queries/getParticipantIncompleteStudies"
import type { ParticipantCompletedNotPaidStudy } from "../queries/getParticipantCompletedNotPaidStudies"

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
  participantCounts: ParticipantStudyCounts | null
  participantCompletedNotPaid: ParticipantCompletedNotPaidStudy[]
}

export default function DashboardContent({
  currentUser,
  researcherCounts,
  activeStudiesWithResponses,
  upcomingDeadlines,
  participantIncompleteStudies,
  participantCounts,
  participantCompletedNotPaid,
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

      <div className="max-w-6xl mx-auto mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        {researcherCounts && <DashboardResearcherSummaryCard counts={researcherCounts} />}
        {participantCounts && <DashboardParticipantSummaryCard counts={participantCounts} />}
        {activeStudiesWithResponses.length > 0 && (
          <DashboardActiveStudiesCard studies={activeStudiesWithResponses} />
        )}
        {researcherCounts && <DashboardUpcomingDeadlinesCard deadlines={upcomingDeadlines} />}
        {isParticipant && (
          <DashboardParticipantIncompleteStudiesCard studies={participantIncompleteStudies} />
        )}
        {isParticipant && (
          <DashboardParticipantCompletedNotPaidCard studies={participantCompletedNotPaid} />
        )}
        <DashboardNotificationsCard />
      </div>
    </main>
  )
}
