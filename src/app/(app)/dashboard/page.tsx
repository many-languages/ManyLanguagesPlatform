import { fallbackOrLoginRedirect } from "@/src/lib/auth/redirectOnAuthenticationError"
import { getSessionContext } from "@/src/lib/auth/session"
import { redirect } from "next/navigation"
import { getLoginUrl } from "@/src/lib/auth/getLoginUrl"
import { getPendingAdminInviteRsc } from "@/src/features/admin-invitations/index.server"
import {
  PortalDashboard,
  type ParticipantCompletedNotPaidStudy,
  type ParticipantIncompleteStudies,
  type UpcomingDeadlines,
} from "@/src/features/dashboard"
import {
  getActiveStudiesWithResponseCounts,
  getParticipantCompletedNotPaidStudies,
  getParticipantIncompleteStudies,
  getParticipantStudyCounts,
  getResearcherStudyCounts,
  getUpcomingDeadlines,
} from "@/src/features/dashboard/index.server"

const emptyDeadlines: UpcomingDeadlines = {
  endingSoon: [],
  startingSoon: [],
  recentlyPastEnd: [],
}

const emptyParticipantStudies: ParticipantIncompleteStudies = {
  nearingDeadline: [],
  passedDeadline: [],
}

export default async function DashboardPage() {
  const session = await getSessionContext()
  if (!session.userId) {
    redirect(await getLoginUrl())
  }

  // The role being used right now comes from the session, not the account: a user holding
  // several roles sees the dashboard of the one they are currently acting as.
  const activeRole = session.role

  const [researcherCounts, activeStudiesWithResponses, upcomingDeadlines] =
    activeRole === "RESEARCHER"
      ? await Promise.all([
          getResearcherStudyCounts().catch(fallbackOrLoginRedirect(null)),
          getActiveStudiesWithResponseCounts().catch(fallbackOrLoginRedirect([])),
          getUpcomingDeadlines().catch(fallbackOrLoginRedirect(emptyDeadlines)),
        ])
      : [null, [], emptyDeadlines]

  const [participantIncompleteStudies, participantCounts, participantCompletedNotPaid] =
    activeRole === "PARTICIPANT"
      ? await Promise.all([
          getParticipantIncompleteStudies().catch(fallbackOrLoginRedirect(emptyParticipantStudies)),
          getParticipantStudyCounts().catch(fallbackOrLoginRedirect(null)),
          getParticipantCompletedNotPaidStudies().catch(
            fallbackOrLoginRedirect([] as ParticipantCompletedNotPaidStudy[])
          ),
        ])
      : [emptyParticipantStudies, null, []]

  // Researchers invited to become admin see a card pointing them to the accept page.
  const pendingAdminInvite = await getPendingAdminInviteRsc().catch(fallbackOrLoginRedirect(null))

  return (
    <PortalDashboard
      activeRole={activeRole}
      researcherCounts={researcherCounts}
      activeStudiesWithResponses={activeStudiesWithResponses}
      upcomingDeadlines={upcomingDeadlines}
      participantIncompleteStudies={participantIncompleteStudies}
      participantCounts={participantCounts}
      participantCompletedNotPaid={participantCompletedNotPaid}
      pendingAdminInvite={pendingAdminInvite}
    />
  )
}
