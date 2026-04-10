"use client"

import DashboardNotificationsCard from "./DashboardNotificationsCard"
import DashboardResearcherSummaryCard from "./DashboardResearcherSummaryCard"
import DashboardActiveStudiesCard from "@/src/app/(app)/dashboard/components/DashboardActiveStudiesCard"
import DashboardUpcomingDeadlinesCard from "./DashboardUpcomingDeadlinesCard"
import DashboardParticipantIncompleteStudiesCard from "./DashboardParticipantIncompleteStudiesCard"
import DashboardParticipantSummaryCard from "./DashboardParticipantSummaryCard"
import DashboardParticipantCompletedNotPaidCard from "./DashboardParticipantCompletedNotPaidCard"
import DashboardStaleAdminInvitesCard from "./DashboardStaleAdminInvitesCard"
import DashboardPendingAdminApprovalCard from "./DashboardPendingAdminApprovalCard"
import type { ResearcherStudyCounts } from "../queries/getResearcherStudyCounts"
import type { ParticipantStudyCounts } from "../queries/getParticipantStudyCounts"
import type { ActiveStudyWithResponseCount } from "../queries/getActiveStudiesWithResponseCounts"
import type { UpcomingDeadlines } from "../queries/getUpcomingDeadlines"
import type { ParticipantIncompleteStudies } from "../queries/getParticipantIncompleteStudies"
import type { ParticipantCompletedNotPaidStudy } from "../queries/getParticipantCompletedNotPaidStudies"
import type { StalePendingAdminInvite } from "@/src/app/(admin)/admin/invitations/queries/getAdminInvites"
import type { PendingAdminApprovalStudyRow } from "@/src/app/(admin)/admin/studies/queries/getPendingAdminApprovalStudies"
import { isStaffAdmin } from "@/src/lib/auth/roles"

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
  staleAdminInvites: StalePendingAdminInvite[]
  pendingAdminApprovalStudies: PendingAdminApprovalStudyRow[]
}

export default function DashboardContent({
  currentUser,
  researcherCounts,
  activeStudiesWithResponses,
  upcomingDeadlines,
  participantIncompleteStudies,
  participantCounts,
  participantCompletedNotPaid,
  staleAdminInvites,
  pendingAdminApprovalStudies,
}: DashboardContentProps) {
  const isParticipant = currentUser?.role === "PARTICIPANT"
  const isSuperAdmin = currentUser?.role === "SUPERADMIN"
  const showPendingApprovalCard = currentUser && isStaffAdmin(currentUser.role)

  return (
    <main>
      <div className="max-w-6xl mx-auto mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        {isSuperAdmin && <DashboardStaleAdminInvitesCard invites={staleAdminInvites} />}
        {showPendingApprovalCard && (
          <DashboardPendingAdminApprovalCard studies={pendingAdminApprovalStudies} />
        )}
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
