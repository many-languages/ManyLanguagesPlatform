import { Suspense } from "react"
import { getBlitzContext } from "../../blitz-server"
import { getCurrentUserRsc } from "../../users/queries/getCurrentUser"
import { getResearcherStudyCounts } from "./queries/getResearcherStudyCounts"
import { getActiveStudiesWithResponseCounts } from "./queries/getActiveStudiesWithResponseCounts"
import { getUpcomingDeadlines, type UpcomingDeadlines } from "./queries/getUpcomingDeadlines"
import {
  getParticipantIncompleteStudies,
  type ParticipantIncompleteStudies,
} from "./queries/getParticipantIncompleteStudies"
import { getParticipantStudyCounts } from "./queries/getParticipantStudyCounts"
import {
  getParticipantCompletedNotPaidStudies,
  type ParticipantCompletedNotPaidStudy,
} from "./queries/getParticipantCompletedNotPaidStudies"
import DashboardContent from "./components/DashboardContent"
import DashboardSkeleton from "./components/DashboardSkeleton"

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

  // Fetch user data server-side (will be cached if already fetched in layout)
  const currentUser = session.userId ? await getCurrentUserRsc().catch(() => null) : null

  // Fetch researcher data for researchers
  const [researcherCounts, activeStudiesWithResponses, upcomingDeadlines] =
    currentUser?.role === "RESEARCHER" && session.userId
      ? await Promise.all([
          getResearcherStudyCounts(session.userId).catch(() => null),
          getActiveStudiesWithResponseCounts(session.userId).catch(() => []),
          getUpcomingDeadlines(session.userId).catch(() => emptyDeadlines),
        ])
      : [null, [], emptyDeadlines]

  // Fetch participant data for participants
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
      <DashboardContent
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
