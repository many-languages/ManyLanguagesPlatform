import { Suspense } from "react"
import { getCurrentUserRsc } from "@/src/features/auth/server/getCurrentUser"
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
  const currentUser = await getCurrentUserRsc().catch(() => null)

  const [researcherCounts, activeStudiesWithResponses, upcomingDeadlines] =
    currentUser?.role === "RESEARCHER"
      ? await Promise.all([
          getResearcherStudyCounts().catch(() => null),
          getActiveStudiesWithResponseCounts().catch(() => []),
          getUpcomingDeadlines().catch(() => emptyDeadlines),
        ])
      : [null, [], emptyDeadlines]

  const [participantIncompleteStudies, participantCounts, participantCompletedNotPaid] =
    currentUser?.role === "PARTICIPANT"
      ? await Promise.all([
          getParticipantIncompleteStudies().catch(() => emptyParticipantStudies),
          getParticipantStudyCounts().catch(() => null),
          getParticipantCompletedNotPaidStudies().catch(
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
