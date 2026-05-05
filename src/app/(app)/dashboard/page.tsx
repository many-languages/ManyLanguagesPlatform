import { Suspense } from "react"
import { getBlitzContext } from "../../blitz-server"
import { getCurrentUserRsc } from "@/src/features/auth/queries/getCurrentUser"
import {
  DashboardSkeleton,
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
  const { session } = await getBlitzContext()

  const currentUser = session.userId ? await getCurrentUserRsc().catch(() => null) : null

  const [researcherCounts, activeStudiesWithResponses, upcomingDeadlines] =
    currentUser?.role === "RESEARCHER" && session.userId
      ? await Promise.all([
          getResearcherStudyCounts(session.userId).catch(() => null),
          getActiveStudiesWithResponseCounts(session.userId).catch(() => []),
          getUpcomingDeadlines(session.userId).catch(() => emptyDeadlines),
        ])
      : [null, [], emptyDeadlines]

  const [participantIncompleteStudies, participantCounts, participantCompletedNotPaid] =
    currentUser?.role === "PARTICIPANT" && session.userId
      ? await Promise.all([
          getParticipantIncompleteStudies(session.userId).catch(() => emptyParticipantStudies),
          getParticipantStudyCounts(session.userId).catch(() => null),
          getParticipantCompletedNotPaidStudies(session.userId).catch(
            () => [] as ParticipantCompletedNotPaidStudy[]
          ),
        ])
      : [emptyParticipantStudies, null, []]

  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <PortalDashboard
        currentUser={currentUser}
        researcherCounts={researcherCounts}
        activeStudiesWithResponses={activeStudiesWithResponses}
        upcomingDeadlines={upcomingDeadlines}
        participantIncompleteStudies={participantIncompleteStudies}
        participantCounts={participantCounts}
        participantCompletedNotPaid={participantCompletedNotPaid}
      />
    </Suspense>
  )
}
