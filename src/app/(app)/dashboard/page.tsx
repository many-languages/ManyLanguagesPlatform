import { fallbackOrLoginRedirect } from "@/src/lib/auth/redirectOnAuthenticationError"
import { getSessionContext } from "@/src/lib/auth/session"
import { redirect } from "next/navigation"
import { getCurrentUserRsc } from "@/src/features/auth/server/getCurrentUser"
import {
  PortalDashboard,
  getActiveStudiesWithResponseCounts,
  getParticipantCompletedNotPaidStudies,
  getParticipantIncompleteStudies,
  getParticipantStudyCounts,
  getResearcherStudyCounts,
  getUpcomingDeadlines,
  type ParticipantCompletedNotPaidStudy,
  type ParticipantIncompleteStudies,
  type UpcomingDeadlines,
} from "@/src/features/dashboard"

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
    redirect("/login")
  }

  const currentUser = await getCurrentUserRsc().catch(fallbackOrLoginRedirect(null))

  const [researcherCounts, activeStudiesWithResponses, upcomingDeadlines] =
    currentUser?.role === "RESEARCHER"
      ? await Promise.all([
          getResearcherStudyCounts().catch(fallbackOrLoginRedirect(null)),
          getActiveStudiesWithResponseCounts().catch(fallbackOrLoginRedirect([])),
          getUpcomingDeadlines().catch(fallbackOrLoginRedirect(emptyDeadlines)),
        ])
      : [null, [], emptyDeadlines]

  const [participantIncompleteStudies, participantCounts, participantCompletedNotPaid] =
    currentUser?.role === "PARTICIPANT"
      ? await Promise.all([
          getParticipantIncompleteStudies().catch(fallbackOrLoginRedirect(emptyParticipantStudies)),
          getParticipantStudyCounts().catch(fallbackOrLoginRedirect(null)),
          getParticipantCompletedNotPaidStudies().catch(
            fallbackOrLoginRedirect([] as ParticipantCompletedNotPaidStudy[])
          ),
        ])
      : [emptyParticipantStudies, null, []]

  return (
    <PortalDashboard
      currentUser={currentUser}
      researcherCounts={researcherCounts}
      activeStudiesWithResponses={activeStudiesWithResponses}
      upcomingDeadlines={upcomingDeadlines}
      participantIncompleteStudies={participantIncompleteStudies}
      participantCounts={participantCounts}
      participantCompletedNotPaid={participantCompletedNotPaid}
    />
  )
}
