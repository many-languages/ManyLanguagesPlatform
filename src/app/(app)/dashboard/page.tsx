import { Suspense } from "react"
import { getBlitzContext } from "../../blitz-server"
import { getCurrentUserRsc } from "../../users/queries/getCurrentUser"
import { getResearcherStudyCounts } from "./queries/getResearcherStudyCounts"
import { getActiveStudiesWithResponseCounts } from "./queries/getActiveStudiesWithResponseCounts"
import { getUpcomingDeadlines, type UpcomingDeadlines } from "./queries/getUpcomingDeadlines"
import DashboardContent from "./components/DashboardContent"
import DashboardSkeleton from "./components/DashboardSkeleton"

export default async function DashboardPage() {
  const { session } = await getBlitzContext()

  // Fetch user data server-side (will be cached if already fetched in layout)
  const currentUser = session.userId ? await getCurrentUserRsc().catch(() => null) : null

  // Fetch researcher data only for researchers
  const emptyDeadlines: UpcomingDeadlines = {
    endingSoon: [],
    startingSoon: [],
    recentlyPastEnd: [],
  }
  const [researcherCounts, activeStudiesWithResponses, upcomingDeadlines] =
    currentUser?.role === "RESEARCHER" && session.userId
      ? await Promise.all([
          getResearcherStudyCounts(session.userId).catch(() => null),
          getActiveStudiesWithResponseCounts(session.userId).catch(() => []),
          getUpcomingDeadlines(session.userId).catch(() => emptyDeadlines),
        ])
      : [null, [], emptyDeadlines]

  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent
        currentUser={currentUser}
        researcherCounts={researcherCounts}
        activeStudiesWithResponses={activeStudiesWithResponses}
        upcomingDeadlines={upcomingDeadlines}
      />
    </Suspense>
  )
}
