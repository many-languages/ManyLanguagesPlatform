import {
  PendingAdminInviteCard,
  type PendingAdminInviteSummary,
} from "@/src/features/admin-invitations"
import NotificationsCard from "./cards/NotificationsCard"
import ResearcherSummaryCard from "./cards/ResearcherSummaryCard"
import ActiveStudiesCard from "./cards/ActiveStudiesCard"
import UpcomingDeadlinesCard from "./cards/UpcomingDeadlinesCard"
import ParticipantIncompleteStudiesCard from "./cards/ParticipantIncompleteStudiesCard"
import ParticipantSummaryCard from "./cards/ParticipantSummaryCard"
import ParticipantCompletedNotPaidCard from "./cards/ParticipantCompletedNotPaidCard"
import type {
  ActiveStudyWithResponseCount,
  ParticipantCompletedNotPaidStudy,
  ParticipantIncompleteStudies,
  ParticipantStudyCounts,
  ResearcherStudyCounts,
  UpcomingDeadlines,
} from "../types"

interface PortalDashboardProps {
  /** The role the user is acting as in this session (not every role the account holds). */
  activeRole: string | null | undefined
  researcherCounts: ResearcherStudyCounts | null
  activeStudiesWithResponses: ActiveStudyWithResponseCount[]
  upcomingDeadlines: UpcomingDeadlines
  participantIncompleteStudies: ParticipantIncompleteStudies
  participantCounts: ParticipantStudyCounts | null
  participantCompletedNotPaid: ParticipantCompletedNotPaidStudy[]
  /** A usable admin invitation waiting for this researcher, if any. */
  pendingAdminInvite: PendingAdminInviteSummary | null
}

export default function PortalDashboard({
  activeRole,
  researcherCounts,
  activeStudiesWithResponses,
  upcomingDeadlines,
  participantIncompleteStudies,
  participantCounts,
  participantCompletedNotPaid,
  pendingAdminInvite,
}: PortalDashboardProps) {
  const isParticipant = activeRole === "PARTICIPANT"

  return (
    <main>
      <div className="max-w-6xl mx-auto mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        {pendingAdminInvite && <PendingAdminInviteCard expiresAt={pendingAdminInvite.expiresAt} />}
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
